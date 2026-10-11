import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { identify } from '../../../api/identify.js';
import Button from '../../../components/ui/Button/Button.jsx';
import FramedImage from '../../../components/ui/FramedImage/FramedImage.jsx';
import Icon from '../../../components/ui/Icon/Icon.jsx';
import PaintingCard from '../../../components/ui/PaintingCard/PaintingCard.jsx';
import Swatch from '../../../components/ui/Swatch/Swatch.jsx';
import { useDocumentTitle } from '../../../hooks/useDocumentTitle.js';
import { cx } from '../../../utils/cx.js';
import './IdentifyStyle.css';

const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

function problemWith(file) {
  if (!file) return 'Choose an image first.';
  const typeOk = TYPES.includes(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name);
  if (!typeOk) return 'That file is not a JPG, PNG or WEBP image. Please choose another one.';
  if (file.size > MAX_BYTES) return 'That image is over 5 MB. Please choose a smaller one.';
  return '';
}

function Finding({ term, children }) {
  return (
    <div className="page-identify__row">
      <dt>{term}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export default function IdentifyStyle() {
  useDocumentTitle('Identify a style');
  const navigate = useNavigate();
  const input = useRef(null);
  const resultsHeading = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [problem, setProblem] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!file) {
      setPreview('');
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (result) resultsHeading.current?.focus();
  }, [result]);

  const choose = (picked) => {
    if (!picked) return;
    const issue = problemWith(picked);
    setError('');
    setResult(null);
    if (issue) {
      setProblem(issue);
      setFile(null);
      return;
    }
    setProblem('');
    setFile(picked);
  };

  const analyse = async () => {
    const issue = problemWith(file);
    if (issue) {
      setProblem(issue);
      return;
    }
    setBusy(true);
    setError('');
    try {
      setResult(await identify(file));
    } catch (err) {
      setError(err.message || 'We could not read that image. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setProblem('');
    setError('');
    if (input.current) input.current.value = '';
    input.current?.focus();
  };

  const onDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    choose(event.dataTransfer.files?.[0]);
  };

  const findings = result?.findings;
  const confidence = (c) => (c === 'likely' ? 'Likely' : 'Possible');

  return (
    <div className="page-identify">
      <div className="container page-head page-identify__intro">
        <h1>Identify a style</h1>
        <p className="page-identify__lead">Upload a photo of a painting to learn its likely style, category, mood and colour palette.</p>
        <p className="page-identify__note">Your image is analysed and then deleted. It is never stored.</p>

        <div
          className={cx('page-identify__drop', dragging && 'page-identify__drop--over')}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={(e) => {
            if (e.target === e.currentTarget) input.current?.click();
          }}
        >
          <label className="page-identify__pick">
            <input
              ref={input}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              className="visually-hidden page-identify__input"
              onChange={(e) => choose(e.target.files?.[0])}
              aria-describedby="identifyHelp identifyProblem"
            />
            <Icon name="upload" size={40} strokeWidth={1.2} />
            <span id="identifyHelp">Drag a painting here or click to choose. JPG, PNG or WEBP, up to 5 MB.</span>
          </label>
          {file && (
            <p className="page-identify__chosen">
              Chosen: <strong>{file.name}</strong>
            </p>
          )}
          <p id="identifyProblem" className="field__error page-identify__problem" role="alert">{problem}</p>
          <Button onClick={analyse} disabled={!file} loading={busy}>Analyse</Button>
        </div>

        {error && (
          <p className="form-error page-identify__error" role="alert">
            {error}
          </p>
        )}

        {!result && file && preview && (error || busy) && (
          <div className="page-identify__waiting">
            <FramedImage src={preview} alt={`Your image, ${file.name}`} frame="mat" fit="contain" ratio="4 / 3" caption={file.name} />
          </div>
        )}

        {result && (
          <section className="page-identify__results" aria-labelledby="identifyResults">
            <h2 id="identifyResults" ref={resultsHeading} tabIndex={-1} className="visually-hidden">Results for {result.fileName}</h2>
            <div className="card page-identify__image-card">
              <FramedImage src={preview} alt={`Your image, ${result.fileName}`} />
              <p className="page-identify__file">{result.fileName}</p>
            </div>
            <div className="card page-identify__findings">
              <h3 className="label">Findings</h3>
              <dl className="page-identify__list">
                <Finding term="Style">
                  <span>{findings.style.value}</span>
                  <span className={cx('page-identify__badge', findings.style.confidence !== 'likely' && 'page-identify__badge--soft')}>
                    {confidence(findings.style.confidence)}
                  </span>
                </Finding>
                <Finding term="Category">{findings.category.value}</Finding>
                <Finding term="Mood">{findings.mood.value}</Finding>
                <Finding term="Medium">
                  {confidence(findings.medium.confidence)} {findings.medium.value.toLowerCase()}
                </Finding>
                <Finding term="Palette">
                  <ul className="page-identify__palette">
                    {findings.palette.map((hex) => (
                      <li key={hex}>
                        <Swatch colour={hex} showHex size="fill" />
                      </li>
                    ))}
                  </ul>
                </Finding>
                <Finding term="Notes">
                  <ul className="page-identify__notes">
                    {findings.notes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </Finding>
              </dl>
              <div className="page-identify__buttons">
                <Button onClick={() => navigate(`/search?q=${encodeURIComponent(result.searchQuery)}`)}>Search the gallery with these</Button>
                <Button variant="secondary" onClick={reset}>Try another image</Button>
              </div>
            </div>
          </section>
        )}
      </div>

      {result?.similar?.length > 0 && (
        <section className="page-identify__similar" aria-labelledby="identifySimilar">
          <div className="container">
            <h2 id="identifySimilar" className="page-identify__similar-title">Similar paintings in ArtMind</h2>
            <div className="grid grid--3 grid--4 page-identify__grid">
              {result.similar.slice(0, 4).map((p) => (
                <PaintingCard key={p.slug} painting={p} showCategory={false} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
