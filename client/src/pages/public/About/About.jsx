import Avatar from '../../../components/ui/Avatar/Avatar.jsx';
import FramedImage from '../../../components/ui/FramedImage/FramedImage.jsx';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import { cx } from '../../../utils/cx.js';
import './About.css';

const SOFT = ['#F8F5EF', '#EAE2D3', '#F8F5EF'];

const FEATURES = [
  {
    title: 'Smart search',
    image: '/images/about/feature_search.jpg',
    alt: 'A drawing of a framed landscape under a magnifying glass',
    text: 'Describe what you want to see, and our smart search understands your words, finds the right paintings and helps you explore more like them.',
  },
  {
    title: 'Recommendations',
    image: '/images/about/feature_recommend.jpg',
    alt: 'A drawing of three framed paintings with the middle one highlighted',
    text: 'The more you look, the better we get to know your taste. We suggest paintings, artists and styles you’ll love, based on what you’ve viewed and saved.',
  },
  {
    title: 'Style recognition',
    image: '/images/about/feature_recognise.jpg',
    alt: 'A drawing of a hand holding a photo next to a framed painting',
    text: 'Upload a painting or photo, and we’ll help you identify the style, period and artists it’s most like.',
  },
  {
    title: 'The assistant',
    image: '/images/about/feature_assistant.jpg',
    alt: 'A drawing of a speech bubble beside a painting on an easel',
    text: 'Ask anything about a painting, an artist or a style. Our assistant is here to give you helpful, friendly answers, anytime.',
  },
];

const TEAM = [
  { name: 'Stanley', role: 'Team leader, backend', photo: '/images/team/profile-placeholder.svg' },
  { name: 'Amanda', role: 'Gallery and discovery pages', photo: '/images/team/profile-placeholder.svg' },
  { name: 'Shalom', role: 'Account, assistant and admin pages', photo: '/images/team/profile-placeholder.svg' },
];

export default function About() {
  useDocumentTitle('About');
  return (
    <div className="page-about">
      <section className="container page-head page-about__intro">
        <span className="label eyebrow">About ArtMind</span>
        <h1 className="page-about__title">A gallery that helps you find what you will love.</h1>
        <p>ArtMind is an online painting gallery that makes it easy to discover, explore and enjoy beautiful works of art from around the world.</p>
        <p>We use smart technology to understand your taste and connect you with paintings, artists and styles you&rsquo;ll love.</p>
        <FramedImage
          src="/images/about/studio.jpg"
          alt="A painter's studio table with brushes in a jar and a palette of paint"
          ratio="4 / 1"
          frame="gallery"
          tones={['#6B4E36', '#C9A04A', '#3A2A1E']}
          loading="eager"
          className="page-about__studio"
        />
      </section>

      <section className="page-about__features" aria-labelledby="featuresTitle">
        <div className="container">
          <span className="label eyebrow" aria-hidden="true">How the smart features work</span>
          <h2 id="featuresTitle" className="page-about__heading">How the smart features work</h2>
          <ul className="page-about__rows">
            {FEATURES.map((f, i) => (
              <li key={f.title} className={cx('page-about__row', i % 2 === 1 && 'page-about__row--flip')}>
                <FramedImage src={f.image} alt={f.alt} ratio="16 / 5" fit="contain" tones={SOFT} className="page-about__drawing" />
                <div className="page-about__row-text">
                  <h3 className="page-about__row-title">{f.title}</h3>
                  <p>{f.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="container page-about__team" aria-labelledby="teamTitle">
        <h2 id="teamTitle" className="label eyebrow">The team</h2>
        <ul className="page-about__people">
          {TEAM.map((person) => (
            <li key={person.name} className="page-about__person">
              <Avatar src={person.photo} name={person.name} size={96} className="page-about__photo" />
              <div>
                <h3 className="page-about__name">{person.name}</h3>
                <p className="page-about__role">{person.role}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
