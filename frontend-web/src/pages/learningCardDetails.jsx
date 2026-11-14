import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Bookmark, BookmarkCheck, CheckCircle2,
  ChevronLeft, LockKeyhole, Play, ShieldAlert, ShieldCheck, Video
} from 'lucide-react';
import useDemoLearning, { LEARNING_STAGES } from '../hooks/useDemoLearning';
import { getAwarenessLevel, lessonScenarios, scamTopics } from '../data/educationData';
import '../css/education.css';

const practiceOptions = [
  'Follow the request because the voice or video seems familiar',
  'End the conversation and verify through a contact method I already trust',
  'Ask the sender to provide another recording as proof'
];

function LearningCardLesson({ topic, learning, toggleSaved, markStageCompleted }) {
  const completedStages = learning.completedStages?.[topic.id] || [];
  const completedCount = LEARNING_STAGES.filter((tier) => completedStages.includes(tier)).length;
  const [currentTier, setCurrentTier] = useState(
    () => LEARNING_STAGES.find((tier) => !completedStages.includes(tier)) || 'Confident'
  );
  const [screen, setScreen] = useState('scenario');
  const [practiceChoice, setPracticeChoice] = useState(null);

  const currentIndex = LEARNING_STAGES.indexOf(currentTier);
  const nextTier = LEARNING_STAGES[currentIndex + 1];
  const progress = Math.round((completedCount / LEARNING_STAGES.length) * 100);

  const scenarioSet = lessonScenarios[topic.id];
  const scenario = scenarioSet?.[currentTier] || {
    scene: topic.introduction,
    redFlags: topic.redFlags,
    mediaLabel: 'Suspicious request'
  };
  const heading = scenarioSet?.heading || topic.title;
  const saved = learning.savedIds.includes(topic.id);

  const assessedPercentage = learning.lastReadiness?.categoryScores?.[topic.categoryCode]?.percentage;
  const assessedLevel = assessedPercentage == null ? null : getAwarenessLevel(assessedPercentage);

  function showCard(tier) {
    const index = LEARNING_STAGES.indexOf(tier);
    if (index > 0 && !completedStages.includes(LEARNING_STAGES[index - 1])) return;
    setCurrentTier(tier);
    setScreen('scenario');
    setPracticeChoice(null);
  }

  function finishCard() {
    markStageCompleted(topic.id, currentTier);
    setScreen(currentTier === 'Confident' ? 'complete' : 'milestone');
  }

  return (
    <main className="edu-page edu-lesson-page">
      <div className="edu-container edu-lesson-shell">
        <div className="edu-lesson-topbar">
          <Link to="/education" className="edu-lesson-back"><ArrowLeft size={19}/><span>Back to Scam Education</span></Link>
        </div>

        {screen !== 'complete' && screen !== 'practice' && (
          <>
            <div className="edu-lesson-score">
              <div className="edu-lesson-score-top">
                <span>Learning progress · {completedCount} of 3 cards completed</span>
                <strong className={`edu-lesson-level ${currentTier.toLowerCase()}`}>{currentTier} card</strong>
              </div>
              <div className="edu-lesson-score-bottom">
                <div className="edu-lesson-progress" role="progressbar" aria-label="Completed learning cards" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
                  <span style={{ width: `${progress}%` }}/>
                </div>
                <span>{progress}%</span>
              </div>
            </div>

            <p className="edu-lesson-stage-heading">{heading} — 3 learning cards</p>
            <div className="edu-lesson-stage-grid" aria-label="Learning card stages">
              {LEARNING_STAGES.map((tier, index) => {
                const done = completedStages.includes(tier);
                const locked = index > 0 && !completedStages.includes(LEARNING_STAGES[index - 1]);
                return (
                  <button key={tier} type="button" disabled={locked}
                    className={`edu-lesson-stage-card ${done ? 'done' : ''} ${tier === currentTier ? 'active' : ''}`}
                    aria-current={tier === currentTier ? 'step' : undefined}
                    onClick={() => showCard(tier)}>
                    <span className="edu-lesson-stage-card-top">
                      <span>Card {index + 1}</span>
                      {done ? <CheckCircle2 size={17} aria-label="Completed"/> : locked ? <LockKeyhole size={16} aria-label="Locked"/> : null}
                    </span>
                    <strong>{tier}</strong>
                    <span className="edu-lesson-stage-meta">{done ? 'Completed' : locked ? 'Finish previous' : tier === currentTier ? 'In progress' : 'Ready'}</span>
                  </button>
                );
              })}
            </div>

            {assessedLevel && (
              <p className="edu-lesson-quiz-note">
                Your readiness-check awareness level: <strong>{assessedLevel} ({assessedPercentage}%)</strong>.
                This stays separate from learning-card completion.
              </p>
            )}
          </>
        )}

        {(screen === 'scenario' || screen === 'redFlags') && (
          <>
            <article className="edu-flip-card">
              <header className="edu-flip-card-heading">
                <h1>{screen === 'scenario' ? 'How it unfolds' : 'Red Flags'}</h1>
                <button type="button" onClick={() => toggleSaved(topic.id)} className="edu-lesson-bookmark"
                  aria-label={saved ? 'Remove learning series from saved' : 'Save learning series'} aria-pressed={saved}>
                  {saved ? <BookmarkCheck size={20}/> : <Bookmark size={20}/>}
                </button>
              </header>
              {screen === 'scenario' ? (
                <>
                  <div className="edu-lesson-media" role="img" aria-label={`Illustrative placeholder: ${scenario.mediaLabel}`}>
                    <span className="edu-lesson-media-icon"><Video size={40}/></span>
                    <span>{scenario.mediaLabel}</span>
                  </div>
                  <div className="edu-lesson-content">
                    <p>{scenario.scene}</p>
                    <button type="button" className="edu-flip-button" onClick={() => setScreen('redFlags')}>
                      Tap to reveal the red flags <ArrowRight size={18}/>
                    </button>
                  </div>
                </>
              ) : (
                <div className="edu-lesson-flags">
                  <ul>{scenario.redFlags.map((flag) => <li key={flag}>{flag}</li>)}</ul>
                  <div className="edu-lesson-flags-actions">
                    <button className="edu-lesson-finish" type="button" onClick={finishCard}>
                      Complete Card {currentIndex + 1} <CheckCircle2 size={17}/>
                    </button>
                    <button type="button" className="edu-flip-button" onClick={() => setScreen('scenario')}>
                      <ChevronLeft size={18}/> Tap to look back at the scenario
                    </button>
                  </div>
                </div>
              )}
            </article>
            <p className="edu-lesson-note">This is a fictional educational example. Never rely on a familiar face or voice alone as proof of identity.</p>
          </>
        )}

        {screen === 'milestone' && (
          <section className="edu-lesson-milestone" role="status">
            <CheckCircle2 size={49}/>
            <span className="edu-lesson-milestone-score">{progress}%</span>
            <h1>{currentTier} card completed!</h1>
            <p>You've completed {completedCount} of 3 learning cards in {heading}. Your next card covers a more challenging situation.</p>
            <button className="edu-primary-button" type="button" onClick={() => showCard(nextTier)}>
              Continue to {nextTier} <ArrowRight size={18}/>
            </button>
            <Link to="/education" className="edu-done-back">Return to Education</Link>
          </section>
        )}

        {screen === 'complete' && (
          <div className="edu-lesson-done" role="status">
            <span className="edu-done-icon"><CheckCircle2 size={53}/></span>
            <p className="edu-done-percentage">100%</p>
            <h1>Lesson Complete!</h1>
            <p>You've completed all three learning cards: Beginner, Developing and Confident. You now know more ways to recognise warning signs and verify requests safely.</p>
            <button type="button" className="edu-done-action" onClick={() => { setPracticeChoice(null); setScreen('practice'); }}>
              Practise with a Scam Scenario <Play size={17}/>
            </button>
            <Link className="edu-done-back" to="/education">Back to learning cards</Link>
            <small>100% is learning-card completion, not your assessed scam-awareness score.</small>
          </div>
        )}

        {screen === 'practice' && (
          <section className="edu-lesson-practice">
            <button type="button" className="edu-lesson-back" onClick={() => setScreen('complete')}><ChevronLeft size={18}/> Back to lesson</button>
            <span className="edu-section-eyebrow">INTERACTIVE PRACTICE PREVIEW</span>
            <h1>What would you do?</h1>
            <p>A person who seems familiar asks you to send money urgently. The voice or video looks convincing, but the contact details are unfamiliar.</p>
            <div className="edu-practice-options" role="group" aria-label="Choose your response">
              {practiceOptions.map((option, index) => (
                <button key={option} type="button" className={practiceChoice === index ? 'selected' : ''}
                  aria-pressed={practiceChoice === index} onClick={() => setPracticeChoice(index)}>{option}</button>
              ))}
            </div>
            {practiceChoice !== null && (
              <div className={`edu-practice-feedback ${practiceChoice === 1 ? 'correct' : ''}`} role="status">
                {practiceChoice === 1 ? <ShieldCheck size={20}/> : <ShieldAlert size={20}/>}
                <p>{practiceChoice === 1
                  ? 'Good choice. Independently verify the request through a contact method you already trust.'
                  : 'That could still be a scam. Voices and videos can be imitated, so another recording is not independent verification.'}</p>
              </div>
            )}
            <div className="edu-practice-actions">
              <button type="button" onClick={() => setPracticeChoice(null)}>Try again</button>
              <Link to="/readiness">Take full readiness check <ArrowRight size={16}/></Link>
            </div>
            <p className="edu-lesson-note">This hardcoded practice preview does not change your readiness score or connect to Twine.</p>
          </section>
        )}
      </div>
    </main>
  );
}

function EducationDetail() {
  const { topicId } = useParams();
  const topic = scamTopics.find((item) => item.id === topicId);
  const { learning, toggleSaved, markStageCompleted } = useDemoLearning();

  if (!topic) {
    return <main className="edu-page"><div className="edu-container edu-not-found"><h1>Learning cards not found</h1><Link to="/education">Back to Scam Education</Link></div></main>;
  }

  return <LearningCardLesson key={topic.id} topic={topic} learning={learning}
    toggleSaved={toggleSaved} markStageCompleted={markStageCompleted}/>;
}

export default EducationDetail;
