import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { getRecipientRisk } from '../services/suspiciousRecipientStorage';
import '../css/suspicious-recipient.css';

export default function SuspiciousRecipientWarning({ recipientId }) {
  const [risk, setRisk] = useState(() => getRecipientRisk(recipientId));
  useEffect(() => {
    const update = () => setRisk(getRecipientRisk(recipientId));
    update();
    window.addEventListener('storage', update);
    window.addEventListener('revent-reports-updated', update);
    return () => {
      window.removeEventListener('storage', update);
      window.removeEventListener('revent-reports-updated', update);
    };
  }, [recipientId]);
  if (!recipientId || !risk.showWarning) return null;
  return (
    <div className="rr-warning" role="status">
      <AlertTriangle size={22} aria-hidden="true" />
      <div><strong>Recipient caution</strong><p>This recipient has received {risk.count} reports in this prototype. Please verify their identity before continuing. Reports do not confirm wrongdoing, and this warning does not block payment.</p></div>
    </div>
  );
}
