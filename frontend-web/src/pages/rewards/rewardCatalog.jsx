import { useEffect, useState } from 'react';

import {
  getPointsBalance,
  getRewardCatalog
} from '../../services/rewardsApi';

import {
  RewardHeading,
  PointsStrip,
  CatalogTile
} from '../../components/rewardUI';

export default function RewardCatalog() {
  const [points, setPoints] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [filter, setFilter] = useState('All');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // Retrieve actual rewards and points balance
  useEffect(() => {
    let active = true;

    async function loadCatalog() {
      setLoading(true);
      setError(null);

      try {
        const [balanceData, catalogData] = await Promise.all([
          getPointsBalance(),
          getRewardCatalog()
        ]);

        if (active) {
          setPoints(balanceData.pointsBalance);
          setCatalog(catalogData.rewards);
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

    loadCatalog();

    return () => {
      active = false;
    };
  }, [retryCount]);

  const categories = [
    'All',
    ...new Set(catalog.map(item => item.category))
  ];

  const filteredRewards = catalog.filter(
    reward => filter === 'All' || reward.category === filter
  );

  return (
    <main className="rw-page">
      <div className="rw-container">

        <RewardHeading
          title="Redeem Rewards"
          subtitle="Choose a reward to see its details"
        />

        {loading ? (
          <div className="rw-empty-inline" role="status">
            Loading available rewards...
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
            <PointsStrip points={points}/>

            <div
              className="rw-filter-pills"
              aria-label="Reward categories"
            >
              {categories.map(category => (
                <button
                  key={category}
                  type="button"
                  className={filter === category ? 'active' : ''}
                  onClick={() => setFilter(category)}
                  aria-pressed={filter === category}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="rw-catalog-grid rw-catalog-full">
              {filteredRewards.map(reward => (
                <CatalogTile
                  key={reward.id}
                  reward={reward}
                  points={points}
                />
              ))}
            </div>

            {!filteredRewards.length && (
              <div className="rw-empty-inline">
                No rewards available in this category.
              </div>
            )}
          </>
        )}

      </div>
    </main>
  );
}