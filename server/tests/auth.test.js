import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = '';

let app;
let validators;
let mail;
let config;

before(async () => {
  ({ createApp: app } = await import('../src/app.js'));
  app = app();
  validators = await import('../src/validators/auth.js');
  mail = await import('../src/services/mail.js');
  ({ config } = await import('../src/config/env.js'));
});

after(async () => {
  const mongoose = (await import('mongoose')).default;
  await mongoose.disconnect();
});

describe('auth', () => {
  test('me answers null when nobody is logged in', async () => {
    const res = await request(app).get('/api/auth/me').expect(200);
    assert.equal(res.body.user, null);
  });

  test('register needs the database', async () => {
    const res = await request(app).post('/api/auth/register').send({}).expect(503);
    assert.equal(res.body.error.code, 'DB_UNAVAILABLE');
  });

  test('register checks every field', () => {
    assert.throws(() => validators.validateRegister({ name: 'A', email: 'bad', password: 'short', interests: ['Abstract'] }), (err) => {
      assert.deepEqual(Object.keys(err.fields).sort(), ['agree', 'email', 'interests', 'name', 'password']);
      return true;
    });
    const ok = validators.validateRegister({
      name: 'Ada Okafor', email: 'ADA@artmind.test ', password: 'Paint1234', interests: ['Landscape', 'Flower', 'Nature'], agree: true,
    });
    assert.equal(ok.email, 'ada@artmind.test');
  });

  test('the code must be six digits', () => {
    assert.throws(() => validators.validateVerify({ email: 'ada@artmind.test', code: '12ab' }));
    assert.equal(validators.validateVerify({ email: 'ada@artmind.test', code: '482915' }).code, '482915');
  });

  test('mail says clearly when Resend is not set up', async () => {
    config.mail.resendKey = '';
    await assert.rejects(mail.sendVerificationCode('ada@artmind.test', 'Ada', '123456'), (err) => err.code === 'MAIL_NOT_SET_UP');
  });

  test('the code is sent through the Resend API', async () => {
    config.mail.resendKey = 're_test';
    config.mail.from = 'ArtMind <hello@artmind.app>';
    const realFetch = globalThis.fetch;
    let sent;
    globalThis.fetch = async (url, options) => {
      sent = { url, options };
      return new Response(JSON.stringify({ id: 'email_1' }), { status: 200 });
    };
    try {
      const result = await mail.sendVerificationCode('ada@artmind.test', 'Ada', '482915');
      assert.equal(result.id, 'email_1');
      assert.equal(sent.url, 'https://api.resend.com/emails');
      assert.equal(sent.options.headers.Authorization, 'Bearer re_test');
      const body = JSON.parse(sent.options.body);
      assert.deepEqual(body.to, ['ada@artmind.test']);
      assert.match(body.subject, /482915/);
    } finally {
      globalThis.fetch = realFetch;
      config.mail.resendKey = '';
    }
  });
});
