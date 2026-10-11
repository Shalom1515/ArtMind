import { useLocation } from 'react-router-dom';
import { useChat } from '../../../context/ChatContext.jsx';
import Icon from '../../ui/Icon/Icon.jsx';
import './ChatLauncher.css';

export default function ChatLauncher() {
  const { isOpen, open } = useChat();
  const { pathname } = useLocation();
  if (isOpen || pathname.startsWith('/assistant')) return null;

  return (
    <button type="button" className="chat-launcher" onClick={() => open()} aria-haspopup="dialog">
      <Icon name="chat" size={20} />
      <span>Ask ArtMind</span>
    </button>
  );
}
