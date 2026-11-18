import { formatDate } from '../../utils/rewardsHelpers';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Gift, Medal, Trophy } from 'lucide-react';
import { RewardHeading, PointsStrip } from '../../components/rewardUI';

import {
  getPointsBalance,
  getPointsHistory
} from '../../services/rewardsApi';

export default function MyPoints() {
  const [points, setPoints] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [tab, setTab] = useState('all');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // Retrieve actual points balance and transaction history
  useEffect(() => {
    let active = true;

    async function loadPoints() {
      setLoading(true);
      setError(null);

      try {
        const [balanceData, historyData] = await Promise.all([
          getPointsBalance(),
          getPointsHistory()
        ]);

        if (active) {
          setPoints(balanceData.pointsBalance);
          setTransactions(historyData.transactions);
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

    loadPoints();

    return () => {
      active = false;
    };
  }, [retryCount]);

  // Convert database records into the existing UI format
  const activity = useMemo(() => transactions
    .map((item) => ({
      id: item.points_transaction_id,
      type: item.points_change > 0 ? 'earned' : 'redeemed',
      points: Number(item.points_change),
      title: item.activity_description,
      at: item.created_at
    }))
    .filter((item) => tab === 'all' || item.type === tab)
    .sort((a, b) => new Date(b.at) - new Date(a.at)),
    [transactions, tab]
  );

  return (
    <main className="rw-page">
      <div className="rw-container rw-narrow">

        <RewardHeading title="My Points"/>

        {loading ? (
          <div className="rw-empty-inline" role="status">
            Loading your points...
          </div>
        ) : error ? (
          <div className="rw-empty-inline" role="alert">
            <p>{error}</p>

            <button
              type="button"
              onClick={() => setRetryCount(previous => previous + 1)}
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            <PointsStrip points={points} link={false}/>

            <h2 className="rw-activity-title">
              My Activity
            </h2>

            {/* Activity filters */}
            <div
              className="rw-segmented"
              role="tablist"
              aria-label="Point activity"
            >
              {['all', 'earned', 'redeemed'].map((value) => (
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === value}
                  key={value}
                  className={tab === value ? 'active' : ''}
                  onClick={() => setTab(value)}
                >
                  {value[0].toUpperCase() + value.slice(1)}
                </button>
              ))}
            </div>

            {/* Transaction history */}
            <div className="rw-activity-list">
              {activity.length ? (
                activity.map((item) => (
                  <article
                    className="rw-activity-row"
                    key={item.id}
                  >
                    <span className="rw-activity-icon">
                      {item.type === 'earned'
                        ? <Trophy size={23}/>
                        : <Gift size={23}/>
                      }
                    </span>

                    <div className="rw-activity-copy">
                      <span>{formatDate(item.at)}</span>
                      <strong>{item.title}</strong>
                    </div>

                    <strong
                      className={
                        item.points > 0
                          ? 'rw-positive'
                          : 'rw-negative'
                      }
                    >
                      {item.points > 0 ? '+' : ''}
                      {item.points} pts
                    </strong>
                  </article>
                ))
              ) : (
                <div className="rw-empty">
                  <Medal size={36}/>
                  <h2>No activity yet</h2>
                  <p>
                    Try another filter or earn points by learning.
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        <Link
          to="/rewards/earn"
          className="rw-inline-link"
        >
          How to earn points <ArrowRight size={16}/>
        </Link>

      </div>
    </main>
  );
}