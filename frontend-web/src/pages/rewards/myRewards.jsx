import { formatDate } from '../../utils/rewardsHelpers';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, ChevronDown, Ticket } from 'lucide-react';
import { getRewardById } from '../../data/rewardsData';

import {
  getMyRewards,
  markRewardUsed
} from '../../services/rewardsApi';

import {
  RewardHeading,
  RewardVisual
} from '../../components/rewardUI';

// Determine actual voucher status
function getVoucherStatus(voucher) {
  if (voucher.status === 'used') return 'used';
  if (voucher.status === 'cancelled') return 'cancelled';

  if (
    voucher.status === 'expired' ||
    new Date(voucher.expiresAt).getTime() <= Date.now()
  ) {
    return 'expired';
  }

  return voucher.status;
}

export default function MyRewards() {
  const [params] = useSearchParams();

  const [allVouchers, setAllVouchers] = useState([]);
  const [tab, setTab] = useState('available');
  const [sort, setSort] = useState('newest');
  const [expandedId, setExpandedId] = useState(
    params.get('voucher')
  );
  const [revealedId, setRevealedId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const busyRef = useRef(false);

  // Retrieve the user's redeemed vouchers
  useEffect(() => {
    let active = true;

    async function loadVouchers() {
      setLoading(true);
      setError('');

      try {
        const data = await getMyRewards();

        if (active) {
          setAllVouchers(data.vouchers);
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

    loadVouchers();

    return () => {
      active = false;
    };
  }, [retryCount]);

  // Filter and sort vouchers
  const vouchers = useMemo(() => allVouchers
    .filter(item => getVoucherStatus(item) === tab)
    .sort((a, b) =>
      sort === 'expiry'
        ? new Date(a.expiresAt) - new Date(b.expiresAt)
        : sort === 'oldest'
          ? new Date(a.redeemedAt) - new Date(b.redeemedAt)
          : new Date(b.redeemedAt) - new Date(a.redeemedAt)
    ), [allVouchers, tab, sort]);

  // Mark voucher as used through the backend
  async function handleMarkUsed(voucherId) {
    if (busyRef.current) return;

    busyRef.current = true;
    setIsUpdating(true);
    setActionError('');

    try {
      const result = await markRewardUsed(voucherId);

      setAllVouchers(previous =>
        previous.map(voucher =>
          voucher.id === voucherId
            ? {
                ...voucher,
                status: 'used',
                usedAt: result.usedAt
              }
            : voucher
        )
      );

      setRevealedId(null);
      setExpandedId(voucherId);
      setTab('used');

    } catch (err) {
      setActionError(err.message);

    } finally {
      busyRef.current = false;
      setIsUpdating(false);
    }
  }

  return (
    <main className="rw-page">
      <div className="rw-container rw-narrow">

        <RewardHeading
          title="My Rewards"
          subtitle="Your available, used and expired vouchers"
        />

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
            {/* Voucher status filters */}
            <div
              className="rw-segmented"
              role="tablist"
              aria-label="Voucher status"
            >
              {['available', 'used', 'expired'].map(status => (
                <button
                  key={status}
                  type="button"
                  role="tab"
                  aria-selected={tab === status}
                  className={tab === status ? 'active' : ''}
                  disabled={isUpdating}
                  onClick={() => {
                    setTab(status);
                    setExpandedId(null);
                    setRevealedId(null);
                    setActionError('');
                  }}
                >
                  {status[0].toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>

            {/* Sorting options */}
            <div className="rw-list-tools">
              <span>
                {vouchers.length}{' '}
                {vouchers.length === 1 ? 'reward' : 'rewards'}
              </span>

              <label className="rw-sort-label">
                Sort by{' '}

                <select
                  value={sort}
                  onChange={event => setSort(event.target.value)}
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="expiry">Expiry date</option>
                </select>
              </label>
            </div>

            {actionError && (
              <p className="rw-error" role="alert">
                {actionError}
              </p>
            )}

            {/* Redeemed voucher list */}
            <div className="rw-my-voucher-list">

              {vouchers.length ? vouchers.map(voucher => {

                // Retain existing visual metadata only
                const metadata = getRewardById(voucher.catalogId);

                const reward = {
                  ...metadata,
                  id: voucher.catalogId,
                  title: voucher.title,
                  subtitle: voucher.description,
                  terms: voucher.terms,
                  category: metadata?.category || 'Other',
                  icon: metadata?.icon || 'gift'
                };

                const open = expandedId === voucher.id;

                return (
                  <article
                    className="rw-my-voucher"
                    key={voucher.id}
                  >

                    <button
                      type="button"
                      className="rw-my-voucher-head"
                      aria-expanded={open}
                      onClick={() => {
                        setExpandedId(open ? null : voucher.id);
                        setRevealedId(null);
                        setActionError('');
                      }}
                    >
                      <RewardVisual reward={reward}/>

                      <span className="rw-my-voucher-name">
                        <strong>{reward.title}</strong>

                        <small className={`rw-status rw-status-${tab}`}>
                          {tab}
                        </small>
                      </span>

                      <ChevronDown
                        className={open ? 'rw-rotate' : ''}
                        size={19}
                      />
                    </button>

                    {open && (
                      <div className="rw-voucher-expanded">

                        <dl>
                          <div>
                            <dt>Voucher code</dt>
                            <dd>
                              {revealedId === voucher.id
                                ? voucher.code
                                : 'DEMO-••••••'}
                            </dd>
                          </div>

                          <div>
                            <dt>Redemption date</dt>
                            <dd>{formatDate(voucher.redeemedAt)}</dd>
                          </div>

                          <div>
                            <dt>Expiry date</dt>
                            <dd>{formatDate(voucher.expiresAt)}</dd>
                          </div>

                          <div>
                            <dt>Points spent</dt>
                            <dd>{voucher.pointsSpent} pts</dd>
                          </div>
                        </dl>

                        {tab === 'available' && (
                          <div className="rw-voucher-actions">

                            <button
                              type="button"
                              className="rw-primary"
                              disabled={isUpdating}
                              onClick={() =>
                                revealedId === voucher.id
                                  ? handleMarkUsed(voucher.id)
                                  : setRevealedId(voucher.id)
                              }
                            >
                              {isUpdating
                                ? 'Updating voucher...'
                                : revealedId === voucher.id
                                  ? 'Mark as Used (Demo)'
                                  : 'Use Now'}
                            </button>

                            {revealedId === voucher.id && (
                              <p>
                                This is a simulated voucher.
                                Select “Mark as Used” to
                                simulate usage.
                              </p>
                            )}

                          </div>
                        )}

                        <details className="rw-terms">
                          <summary>T&amp;Cs apply</summary>
                          <p>{reward.terms}</p>
                        </details>

                      </div>
                    )}

                  </article>
                );

              }) : (
                <div className="rw-empty">
                  <Ticket size={38}/>
                  <h2>No {tab} vouchers</h2>
                  <p>Rewards in this category will appear here.</p>

                  <Link to="/rewards/catalog">
                    Explore rewards
                  </Link>
                </div>
              )}

            </div>
          </>
        )}

        <Link
          to="/rewards/catalog"
          className="rw-inline-link"
        >
          Browse more rewards <ArrowRight size={16}/>
        </Link>

      </div>
    </main>
  );
}