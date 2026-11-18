import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  ChevronRight,
  Gift,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

import {
  getPointsBalance,
  getRewardCatalog,
  getMyRewards
} from '../../services/rewardsApi';

import {
  RewardHeading,
  PointsStrip,
  MiniVoucher,
  CatalogTile,
  SectionTitle
} from '../../components/rewardUI';

function RewardsHome() {
  const [points, setPoints] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [vouchers, setVouchers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // Retrieve actual rewards data from Supabase
  useEffect(() => {
    let active = true;

    async function loadRewards() {
      setLoading(true);
      setError(null);

      try {
        const [balanceData, catalogData, voucherData] =
          await Promise.all([
            getPointsBalance(),
            getRewardCatalog(),
            getMyRewards()
          ]);

        if (active) {
          setPoints(balanceData.pointsBalance);
          setCatalog(catalogData.rewards);
          setVouchers(voucherData.vouchers);
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

    loadRewards();

    return () => {
      active = false;
    };
  }, [retryCount]);

  // Display only available and unexpired vouchers
  const available = vouchers.filter(
    voucher =>
      voucher.status === 'available' &&
      new Date(voucher.expiresAt).getTime() > Date.now()
  );

  return (
    <main className="rw-page rw-home-page">
      <div className="rw-container">

        <RewardHeading
          title="Rewards"
          subtitle="Earn points, redeem rewards and build safer banking habits."
          back={null}
        />
        
        <section className="rw-hero">
          <div>
            <h2>Learn | Practise | Stay Safe</h2>

            <p>
              Build your scam awareness and earn rewards
              along the way.
            </p>
          </div>

          <div className="rw-hero-gift" aria-hidden="true">
            <Gift size={62} strokeWidth={1.6}/>
            <Sparkles size={23}/>
          </div>
        </section>

        {loading ? (
          <div className="rw-empty-inline" role="status">
            Loading your rewards...
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

            <div className="rw-dashboard-grid">

              {/* My Rewards */}
              <section className="rw-section">

                <SectionTitle path="/rewards/mine">
                  My Rewards
                </SectionTitle>

                <div className="rw-mini-vouchers">

                  {available.length ? (
                    available.slice(0, 3).map(voucher => (
                      <MiniVoucher
                        key={voucher.id}
                        voucher={voucher}
                        to={`/rewards/mine?voucher=${voucher.id}`}
                      />
                    ))
                  ) : (
                    <div className="rw-empty-inline">
                      No available vouchers yet.{' '}
                      <Link to="/rewards/catalog">
                        Explore rewards
                      </Link>
                    </div>
                  )}

                </div>
              </section>

              {/* Earn Points */}
              <section className="rw-section">

                <SectionTitle path="/rewards/earn">
                  Earn Points
                </SectionTitle>

                <div className="rw-earn-list">

                  <Link className="rw-earn-item" to="/education">
                    <span className="rw-earn-icon">
                      <BookOpen size={24}/>
                    </span>

                    <span>
                      <strong>Complete a learning card</strong>
                      <small>
                        Learn how to spot an AI-powered scam
                      </small>
                    </span>

                    <span className="rw-earn-pill">+10 pts</span>

                    <ChevronRight size={18} aria-hidden="true"/>
                  </Link>

                  <Link className="rw-earn-item" to="/readiness">
                    <span className="rw-earn-icon">
                      <ShieldCheck size={24}/>
                    </span>

                    <span>
                      <strong>Check your scam readiness</strong>
                      <small>Find out what to practise next</small>
                    </span>

                    <span className="rw-earn-pill">+5 pts</span>

                    <ChevronRight size={18} aria-hidden="true"/>
                  </Link>

                </div>
              </section>

            </div>

            {/* Redeem Rewards */}
            <section className="rw-section rw-redeem-preview">

              <SectionTitle path="/rewards/catalog">
                Redeem Rewards
              </SectionTitle>

              <div className="rw-catalog-grid">
                {catalog.slice(0, 3).map(reward => (
                  <CatalogTile
                    key={reward.id}
                    reward={reward}
                    points={points}
                  />
                ))}
              </div>

            </section>
          </>
        )}

        <p className="rw-demo-note">
          Rewards are provided for educational purposes only.
          No real vouchers or gift cards are issued.
        </p>

      </div>
    </main>
  );
}

export default RewardsHome;