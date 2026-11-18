import { Link } from 'react-router-dom';
import { BookOpen, ChevronRight, Medal, ShieldCheck } from 'lucide-react';
import { earnPointTasks } from '../../data/rewardsData';
import { RewardHeading } from '../../components/rewardUI';

export default function EarnPoints() {
  return (
    <main className="rw-page">
      <div className="rw-container rw-narrow">

        <RewardHeading
          title="Earn Points"
          subtitle="Explore ways to build scam awareness"
        />

        <div className="rw-earn-tasks">
          {earnPointTasks.map((task) => (
            <Link
              key={task.id}
              to={task.path}
              className="rw-task-card"
            >
              <span className="rw-task-icon">
                {task.id === 'learning'
                  ? <BookOpen/>
                  : task.id === 'practice'
                    ? <ShieldCheck/>
                    : <Medal/>
                }
              </span>

              <span>
                <strong>{task.title}</strong>
                <small>{task.description}</small>
              </span>

              {task.id === 'learning' && (
                  <span className="rw-earn-pill">+10 pts</span>
              )}

              {task.path.toLowerCase() === '/readiness' && (
                  <span className="rw-earn-pill">+5 pts</span>
              )}

              <ChevronRight size={20} aria-hidden="true"/>

            </Link>
          ))}
        </div>

        <p className="rw-demo-note">
            Points are awarded for first-time learning card
            completions and once per account for completing
            the Scam Readiness Check.
        </p>
 
      </div>
    </main>
  );
}