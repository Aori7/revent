import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { getMyRewards } from '../../services/rewardsApi';

export default function RedemptionSuccess() {
  const [params] = useSearchParams();
  const id = params.get('voucher');

  const [voucher, setVoucher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  // Retrieve the redeemed voucher from Supabase
  useEffect(() => {
    let active = true;

    async function loadVoucher() {
      setLoading(true);
      setError('');
      setVoucher(null);

      try {
        if (!id) return;

        const data = await getMyRewards();

        if (active) {
          setVoucher(
            data.vouchers.find(entry => entry.id === id) || null
          );
        }

      } catch (err) {
        if (active) {
          setError(err.message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadVoucher();

    return () => {
      active = false;
    };
  }, [id, retryCount]);

  return (
    <main className="rw-page">
      <div className="rw-container rw-success-wrap">
        <div className="rw-success">

          {loading ? (
            <p role="status">
              Retrieving your redeemed voucher...
            </p>

          ) : error ? (
            <>
              <h1>Unable to retrieve voucher</h1>

              <p className="rw-error" role="alert">
                {error}
              </p>

              <button
                type="button"
                className="rw-primary"
                onClick={() => setRetryCount(previous => previous + 1)}
              >
                Try again
              </button>
            </>

          ) : voucher ? (
            <>
              <span className="rw-success-icon">
                <CheckCircle2 size={60}/>
              </span>

              <h1>Redemption Successful!</h1>

              <p>
                Your <strong>{voucher.title}</strong> has
                been added to My Rewards.
              </p>

              <p>
                <strong>{voucher.pointsSpent} points</strong> redeemed.
              </p>

              <p className="rw-success-hint">
                This voucher is for educational purposes only.
                No real gift card is issued.
              </p>
            </>

          ) : (
            <>
              <h1>Rewards</h1>
              <p>There is no new redemption to display.</p>
            </>
          )}

          <Link
            className="rw-primary"
            to={voucher
              ? `/rewards/mine?voucher=${encodeURIComponent(voucher.id)}`
              : '/rewards/mine'}
          >
            View My Rewards
          </Link>

          <Link className="rw-secondary-link" to="/rewards">
            Back to Rewards page
          </Link>

        </div>
      </div>
    </main>
  );
}