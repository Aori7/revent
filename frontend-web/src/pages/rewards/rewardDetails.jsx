import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Star } from 'lucide-react';

import {
  getPointsBalance,
  getRewardCatalog,
  redeemReward
} from '../../services/rewardsApi';

import {
  RewardHeading,
  RewardVisual
} from '../../components/rewardUI';

export default function RewardDetails() {
  const { voucherId } = useParams();
  const navigate = useNavigate();

  const [reward, setReward] = useState(null);
  const [points, setPoints] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const requestRef = useRef(null);
  const busyRef = useRef(false);

  // Retrieve reward details and actual points
  useEffect(() => {
    let active = true;

    async function loadReward() {
      setLoading(true);
      setLoadError('');
      setError('');

      try {
        const [balanceData, catalogData] = await Promise.all([
          getPointsBalance(),
          getRewardCatalog()
        ]);

        if (active) {
          setPoints(balanceData.pointsBalance);

          setReward(
            catalogData.rewards.find(
              item => item.id === voucherId
            ) || null
          );
        }

      } catch (err) {
        if (active) {
          setLoadError(err.message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadReward();

    return () => {
      active = false;
    };
  }, [voucherId, retryCount]);

  // Redeem reward securely through the backend
  async function handleRedeem() {
    if (
      busyRef.current ||
      loading ||
      !reward ||
      points < reward.cost
    ) {
      return;
    }

    busyRef.current = true;
    setIsRedeeming(true);
    setError('');

    try {
      // Reuse the same request ID if redemption is retried
      if (requestRef.current?.rewardCode !== reward.id) {
        requestRef.current = {
          rewardCode: reward.id,
          requestId: crypto.randomUUID()
        };
      }

      const result = await redeemReward(
        reward.id,
        requestRef.current.requestId
      );

      navigate(
        `/rewards/success?voucher=${encodeURIComponent(result.redemptionId)}`,
        { replace: true }
      );

    } catch (err) {
      setError(err.message);

    } finally {
      busyRef.current = false;
      setIsRedeeming(false);
    }
  }

  if (loading) {
    return (
      <main className="rw-page">
        <div className="rw-container rw-narrow">
          <RewardHeading title="Rewards" back="/rewards/catalog"/>
          <p role="status">Loading reward details...</p>
        </div>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="rw-page">
        <div className="rw-container rw-narrow">
          <RewardHeading title="Rewards" back="/rewards/catalog"/>
          <p role="alert" className="rw-error">{loadError}</p>

          <button
            type="button"
            className="rw-primary"
            onClick={() => setRetryCount(previous => previous + 1)}
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  if (!reward) {
    return (
      <main className="rw-page">
        <div className="rw-container rw-narrow">
          <RewardHeading title="Reward not found"/>
          <p>This voucher is currently unavailable.</p>
          <Link to="/rewards/catalog">Browse rewards</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="rw-page">
      <div className="rw-container rw-detail-width">

        <RewardHeading
          title="Rewards"
          back="/rewards/catalog"
        />

        <article className="rw-detail-card">

          <RewardVisual
              icon={reward.icon}
              imagePath={reward.imagePath}
          />

          <div className="rw-detail-body">

            <span className="rw-eyebrow">
              {reward.category}
            </span>

            <h1>{reward.title}</h1>

            <p className="rw-detail-subtitle">
              {reward.subtitle}
            </p>

            <p className="rw-detail-price">
              <Star size={19}/>
              {reward.cost} pts
            </p>

            <hr/>

            <details className="rw-terms">
              <summary>Terms &amp; Conditions</summary>

              <ul>
                {reward.details.map(detail => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>

              <p>{reward.terms}</p>
            </details>

            <p className="rw-detail-balance">
              Your balance:{' '}
              <strong>{points.toLocaleString()} pts</strong>
            </p>

            {error && (
              <p role="alert" className="rw-error">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={handleRedeem}
              className="rw-primary rw-redeem-button"
              disabled={isRedeeming || points < reward.cost}
            >
              {isRedeeming
                ? 'Redeeming reward...'
                : points < reward.cost
                  ? `Need ${reward.cost - points} more points`
                  : `Redeem for ${reward.cost} pts`
              }
            </button>

            <p className="rw-demo-note">
              This is a simulated voucher for educational
              purposes. No real gift card is issued.
            </p>

          </div>
        </article>
      </div>
    </main>
  );
}