import { useLocation } from 'react-router-dom';
import { useChat } from '../../../context/ChatContext.jsx';
import Icon from '../../ui/Icon/Icon.jsx';
import './ChatLauncher.css';

export default function ChatLauncher() {
  const { isOpen, open, launcherRef } = useChat();
  const { pathname } = useLocation();
  if (pathname.startsWith('/assistant')) return null;

  return (
    <button ref={launcherRef} type="button" className="chat-launcher" onClick={() => open()} aria-haspopup="dialog" hidden={isOpen}>
      <Icon name="chat" size={20} />
      <span>Ask ArtMind</span>
    </button>
  );
}
