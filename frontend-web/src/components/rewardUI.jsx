import { Link } from 'react-router-dom';
import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bus,
  ChevronRight,
  Coffee,
  Gift,
  ShoppingBasket,
  Star
} from 'lucide-react';

import { getRewardById } from '../data/rewardsData';
import { getStatus } from '../utils/rewardsHelpers';

export function RewardVisual({ icon, imagePath }) {
  const [failedImage, setFailedImage] = useState(null);

  const Icon =
    icon === 'bus' ? Bus :
    icon === 'coffee' ? Coffee :
    icon === 'shopping-basket' ? ShoppingBasket :
    Gift;

  return (
    <div className="rw-visual" aria-hidden="true">
      {imagePath && failedImage !== imagePath ? (
        <img
          src={imagePath}
          alt=""
          className="rw-voucher-image"
          onError={() => setFailedImage(imagePath)}
        />
      ) : (
        <Icon />
      )}
    </div>
  );
}

export function RewardHeading({
  title,
  back = '/rewards',
  subtitle,
  action
}) {
  return (
    <header className="rw-topbar">
      <div className="rw-topbar-title">
        {back && (
          <Link to={back} className="rw-back" aria-label="Back">
            <ArrowLeft size={21}/>
          </Link>
        )}

        <div>
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>

      {action}
    </header>
  );
}

export function PointsStrip({ points, link = true }) {
  const contents = (
    <>
      <span className="rw-points-seal">
        <Star size={27}/>
      </span>

      <span className="rw-points-copy">
        <span>My Points</span>

        <strong>
          {points.toLocaleString()} <small>pts</small>
        </strong>

        <small>Available for redemption</small>
      </span>

      {link && (
        <ChevronRight
          size={21}
          className="rw-points-arrow"
        />
      )}
    </>
  );

  return link ? (
    <Link to="/rewards/points" className="rw-points-strip">
      {contents}
    </Link>
  ) : (
    <div className="rw-points-strip">
      {contents}
    </div>
  );
}

export function MiniVoucher({ voucher, to }) {
  // Retrieve local metadata for the icon only
  const metadata = getRewardById(voucher.catalogId);

  const reward = {
    id: voucher.catalogId,
    title: voucher.title,
    icon: metadata?.icon || 'gift'
  };

  const status = getStatus(voucher);

  return (
    <Link to={to} className="rw-mini-voucher">

      <RewardVisual
          icon={reward?.icon}
          imagePath={voucher.imagePath}
      />

      <span className="rw-mini-voucher-copy">
        <strong>{reward.title}</strong>

        <small className={`rw-status rw-status-${status}`}>
          {status}
        </small>
      </span>

      <ChevronRight size={19}/>

    </Link>
  );
}

export function CatalogTile({ reward, points }) {
  return (
    <Link
      className="rw-catalog-tile"
      to={`/rewards/voucher/${reward.id}`}
    >

      <RewardVisual
        icon={reward.icon}
        imagePath={reward.imagePath}
      />

      <span className="rw-catalog-info">
        <strong>{reward.title}</strong>

        <span>
          <Star size={13}/> {reward.cost} pts
        </span>
      </span>

      <ChevronRight
        size={18}
        className="rw-catalog-chevron"
      />

      {points < reward.cost && (
        <span className="rw-catalog-small-note">
          Earn more points
        </span>
      )}
    </Link>
  );
}

export function SectionTitle({ children, path }) {
  return (
    <div className="rw-section-title">
      <h2>{children}</h2>

      <Link to={path}>
        View All <ArrowRight size={14}/>
      </Link>
    </div>
  );
}