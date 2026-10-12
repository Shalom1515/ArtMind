import request from 'supertest';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import app from '../src/app.js';
import { Session, User } from '../src/models/index.js';
import { sendVerificationCode, sent } from '../src/services/mail/index.js';
import { loginAs, PASSWORDS, startTestDb } from './helpers.js';

let db;

beforeAll(async () => {
  db = await startTestDb({ seed: true });
});

afterAll(async () => {
  await db.stop();
});

const lastMailTo = (email) => [...sent].reverse().find((m) => m.to === email);
const newUser = { name: 'Bola Ade', email: 'bola@example.com', password: 'Paint1234', interests: ['Landscape', 'Flower', 'Nature'], agree: true };

describe('auth flow', () => {
  test('register checks every field', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'A', email: 'bad', password: 'short', interests: ['Abstract'] }).expect(400);
    expect(res.body.error.code).toBe('VALIDATION');
    expect(Object.keys(res.body.error.fields).sort()).toEqual(['agree', 'email', 'interests', 'name', 'password']);
  });

  test('register stores the interests and emails a six digit code that is stored hashed', async () => {
    const res = await request(app).post('/api/auth/register').send(newUser).expect(201);
    expect(res.body).toEqual({ email: 'bola@example.com', message: 'We sent a six digit code to bola@example.com.' });
    expect(lastMailTo('bola@example.com').code).toMatch(/^\d{6}$/);
    const user = await User.findOne({ email: 'bola@example.com' }).select('+verification.codeHash');
    expect(user.interests).toEqual(['Landscape', 'Flower', 'Nature']);
    expect(user.verification.codeHash).not.toBe(lastMailTo('bola@example.com').code);
    expect(user.verification.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(10 * 60 * 1000);
  });

  test('registering a verified email gives 409', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...newUser, email: 'ada@artmind.test' }).expect(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  test('a resend within 60 seconds is refused', async () => {
    const res = await request(app).post('/api/auth/resend').send({ email: 'bola@example.com' }).expect(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
  });

  test('logging in before verifying answers 403 NOT_VERIFIED', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'bola@example.com', password: 'Paint1234' }).expect(403);
    expect(res.body.error.code).toBe('NOT_VERIFIED');
  });

  test('a wrong code counts as an attempt, the right one logs the user in', async () => {
    const code = lastMailTo('bola@example.com').code;
    const wrong = code === '000000' ? '111111' : '000000';
    const bad = await request(app).post('/api/auth/verify').send({ email: 'bola@example.com', code: wrong }).expect(400);
    expect(bad.body.error.fields.code).toBeTruthy();

    const agent = request.agent(app);
    const res = await agent.post('/api/auth/verify').send({ email: 'bola@example.com', code }).expect(200);
    expect(res.body.user).toMatchObject({ email: 'bola@example.com', verified: true, role: 'user' });
    expect(String(res.headers['set-cookie'])).toMatch(/artmind_token=.*HttpOnly.*SameSite=Lax/i);
    expect((await agent.get('/api/auth/me').expect(200)).body.user.email).toBe('bola@example.com');
  });

  test('a wrong password gives the same 401 message', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'ada@artmind.test', password: 'Wrong1234' }).expect(401);
    expect(res.body.error).toEqual({ message: 'Email or password is not right.', code: 'UNAUTHENTICATED' });
    const unknown = await request(app).post('/api/auth/login').send({ email: 'nobody@example.com', password: 'Wrong1234' }).expect(401);
    expect(unknown.body.error.message).toBe(res.body.error.message);
  });

  test('remember me keeps the cookie for 30 days, otherwise it is a browser session cookie', async () => {
    const remembered = await request(app).post('/api/auth/login').send({ email: 'ada@artmind.test', password: PASSWORDS.user, remember: true }).expect(200);
    expect(String(remembered.headers['set-cookie'])).toMatch(/Max-Age=2592000/);
    const session = await request(app).post('/api/auth/login').send({ email: 'ada@artmind.test', password: PASSWORDS.user }).expect(200);
    expect(String(session.headers['set-cookie']).split(',').find((c) => c.includes('artmind_token'))).not.toMatch(/Max-Age/);
  });

  test('forgot always answers the same and reset works once, ending every session', async () => {
    const before = await loginAs(app, 'user');
    const message = 'If that email is registered, a reset link is on its way.';
    expect((await request(app).post('/api/auth/forgot').send({ email: 'nobody@example.com' }).expect(200)).body.message).toBe(message);
    expect((await request(app).post('/api/auth/forgot').send({ email: 'ada@artmind.test' }).expect(200)).body.message).toBe(message);
    const link = lastMailTo('ada@artmind.test').link;
    expect(link).toMatch(/\/reset\/[a-f0-9]{64}$/);
    const token = link.split('/reset/')[1];

    await request(app).post('/api/auth/reset').send({ token, password: 'NewPass123' }).expect(200);
    await request(app).post('/api/auth/reset').send({ token, password: 'Other1234' }).expect(400);
    expect((await before.get('/api/auth/me')).body.user).toBeNull();
    await request(app).post('/api/auth/login').send({ email: 'ada@artmind.test', password: 'NewPass123' }).expect(200);

    const ada = await User.findOne({ email: 'ada@artmind.test' });
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email: 'ada@artmind.test', password: 'NewPass123' }).expect(200);
    await agent.put('/api/me/password').send({ currentPassword: 'NewPass123', newPassword: PASSWORDS.user }).expect(200);
    expect(await Session.countDocuments({ user: ada._id })).toBe(1);
  });

  test('change password needs the current password', async () => {
    const agent = await loginAs(app, 'user');
    const res = await agent.put('/api/me/password').send({ currentPassword: 'Wrong1234', newPassword: 'Another123' }).expect(400);
    expect(res.body.error.fields.currentPassword).toBe('Your current password is not right.');
  });

  test('sign out of other devices ends the other sessions only', async () => {
    const phone = await loginAs(app, 'user');
    const laptop = await loginAs(app, 'user');
    const res = await laptop.delete('/api/me/sessions').expect(200);
    expect(res.body.signedOut).toBeGreaterThanOrEqual(1);
    expect((await phone.get('/api/auth/me')).body.user).toBeNull();
    expect((await laptop.get('/api/auth/me')).body.user.email).toBe('ada@artmind.test');
  });

  test('logout deletes the session and clears the cookie', async () => {
    const agent = await loginAs(app, 'user');
    const res = await agent.post('/api/auth/logout').expect(200);
    expect(res.body.message).toBe('Logged out.');
    expect((await agent.get('/api/auth/me')).body.user).toBeNull();
  });

  test('a deactivated user is signed out and cannot log in', async () => {
    const adminAgent = await loginAs(app, 'admin');
    const bola = await User.findOne({ email: 'bola@example.com' });
    const bolaAgent = request.agent(app);
    await bolaAgent.post('/api/auth/login').send({ email: 'bola@example.com', password: 'Paint1234' }).expect(200);
    await adminAgent.patch(`/api/admin/users/${bola._id}/active`).send({ active: false }).expect(200);
    expect((await bolaAgent.get('/api/auth/me')).body.user).toBeNull();
    const res = await request(app).post('/api/auth/login').send({ email: 'bola@example.com', password: 'Paint1234' }).expect(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  test('keys starting with $ are removed before validation', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: { $ne: '' }, password: { $gt: '' } }).expect(400);
    expect(res.body.error.code).toBe('VALIDATION');
  });
});

describe('when the code email cannot be sent', () => {
  test('register says so instead of claiming it was sent, and the user can try again at once', async () => {
    const person = { ...newUser, email: 'nomail@example.com' };
    sendVerificationCode.mockResolvedValueOnce({ sent: false });
    const res = await request(app).post('/api/auth/register').send(person).expect(503);
    expect(res.body.error.code).toBe('MAIL_FAILED');

    await request(app).post('/api/auth/resend').send({ email: person.email }).expect(200);
    expect(lastMailTo(person.email).code).toMatch(/^\d{6}$/);
  });
});
