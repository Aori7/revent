import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowLeft,
    ArrowRight,
    BookOpen,
    CheckCircle2,
    ChevronRight,
    GraduationCap,
    Info,
    RotateCcw,
    ShieldCheck,
    TrendingUp
} from 'lucide-react';

import useDemoLearning from '../hooks/useDemoLearning';
import {
    awarenessCategories,
    scamTopics
} from '../data/educationData';

import { getAwarenessLevels } from '../services/readinessApi';

import '../css/education.css';

function Awareness() {
    const { learning } = useDemoLearning();

    const [levels, setLevels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [retryCount, setRetryCount] = useState(0);

    // Retrieve personalised awareness levels
    useEffect(() => {
        let cancelled = false;

        async function loadAwarenessLevels() {
            setLoading(true);
            setError('');

            try {
                const data = await getAwarenessLevels();

                if (!cancelled) {
                    setLevels(data.levels);
                }

            } catch (error) {
                if (!cancelled) {
                    setError(error.message);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadAwarenessLevels();

        return () => {
            cancelled = true;
        };
    }, [retryCount]);

    // Existing learning progress
    const completeCount = learning.completedIds.filter(
        id => scamTopics.some(topic => topic.id === id)
    ).length;

    // Format database awareness levels
    function formatLevel(level) {
        const labels = {
            BEGINNER: 'Beginner',
            DEVELOPING: 'Developing',
            CONFIDENT: 'Confident'
        };

        return labels[level] || 'Not assessed';
    }

    // Match database results to existing category cards
    const categories = awarenessCategories.map(item => {
        const score = levels.find(
            level => level.category === item.code
        );

        return {
            ...item,
            percent: score?.percentage ?? null,
            level: formatLevel(score?.level),
            consecutiveWeakResults:
                score?.consecutiveWeakResults ?? 0
        };
    });

    const assessedCount = categories.filter(
        item => item.percent !== null
    ).length;

    const hasCompletedQuiz =
        assessedCount === awarenessCategories.length;

    // Reconstruct the displayed score from category percentages
    // Each category contains three questions
    const totalCorrect = categories.reduce(
        (total, item) =>
            total + Math.round((item.percent ?? 0) * 3 / 100),
        0
    );

    // Loading state
    if (loading) {
        return (
            <main className="edu-page">
                <div className="edu-container">
                    <h2>Loading your awareness levels...</h2>
                    <p>Retrieving your latest assessment results.</p>
                </div>
            </main>
        );
    }

    // Error state
    if (error) {
        return (
            <main className="edu-page">
                <div className="edu-container">
                    <h2>Unable to load awareness levels</h2>

                    <p role="alert">{error}</p>

                    <button
                        type="button"
                        className="edu-primary-button"
                        onClick={() =>
                            setRetryCount(prev => prev + 1)
                        }
                    >
                        Try again
                    </button>

                    <Link
                        to="/education"
                        className="edu-back-link"
                    >
                        <ArrowLeft size={18}/>
                        Back to Scam Education
                    </Link>
                </div>
            </main>
        );
    }

    return (
        <main className="edu-page">
            <div className="edu-container">

                <Link
                    to="/education"
                    className="edu-back-link edu-awareness-back"
                >
                    <ArrowLeft size={18}/>
                    Back to Scam Education
                </Link>

                <div className="edu-page-heading">
                    <span className="edu-eyebrow">
                        <ShieldCheck size={17}/>
                        YOUR LEARNING JOURNEY
                    </span>

                    <h1>Scam Awareness</h1>

                    <p>
                        Explore what you already know and discover
                        which scam scenarios to practise next.
                    </p>
                </div>

                <div className="edu-awareness-overview">

                    <div className="edu-awareness-summary">
                        <span className="edu-summary-label">
                            YOUR READINESS
                        </span>

                        <h2>
                            {hasCompletedQuiz
                                ? 'Your latest practice results'
                                : 'Know where you stand'}
                        </h2>

                        <p>
                            {hasCompletedQuiz
                                ? 'Your results are securely saved to your account and updated after each assessment.'
                                : 'Take a short readiness check to see your awareness level for three scam categories.'}
                        </p>

                        <Link
                            to="/readiness"
                            className="edu-primary-button"
                        >
                            <GraduationCap size={19}/>

                            {hasCompletedQuiz
                                ? 'Retake readiness check'
                                : 'Take readiness check'}

                            <ArrowRight size={18}/>
                        </Link>
                    </div>

                    <div className="edu-awareness-metrics">

                        <div>
                            <span>Learning paths completed</span>
                            <strong>
                                {completeCount}
                                <small> / {scamTopics.length}</small>
                            </strong>
                            <BookOpen size={22}/>
                        </div>

                        <div>
                            <span>Last readiness score</span>
                            <strong>
                                {hasCompletedQuiz
                                    ? `${totalCorrect}/9`
                                    : '—'}
                            </strong>
                            <TrendingUp size={22}/>
                        </div>

                        <div>
                            <span>Categories assessed</span>
                            <strong>
                                {assessedCount}/{awarenessCategories.length}
                            </strong>
                            <CheckCircle2 size={22}/>
                        </div>

                    </div>
                </div>

                <div className="edu-section-heading edu-awareness-heading">
                    <div>
                        <span className="edu-section-eyebrow">
                            BY SCAM CATEGORY
                        </span>

                        <h2>Your awareness levels</h2>

                        <p>
                            {hasCompletedQuiz
                                ? 'Personalised levels based on your assessment history.'
                                : 'Complete a readiness check to reveal your levels.'}
                        </p>
                    </div>
                </div>

                <div className="edu-level-grid">

                    {categories.map(item => (
                        <article
                            className="edu-level-card"
                            key={item.code}
                        >
                            <div className="edu-level-card-top">

                                <span className="edu-level-icon">
                                    <ShieldCheck size={22}/>
                                </span>

                                <span className={
                                    `edu-level-pill ${
                                        item.level
                                            .toLowerCase()
                                            .replace(' ', '-')
                                    }`
                                }>
                                    {item.level}
                                </span>

                            </div>

                            <h3>{item.title}</h3>
                            <p>{item.description}</p>

                            <div className="edu-level-score">
                                <strong>
                                    {item.percent == null
                                        ? 'Not assessed'
                                        : `${item.percent}%`}
                                </strong>

                                <span>
                                    {item.percent == null
                                        ? 'Take the check to get your score'
                                        : 'Latest category score'}
                                </span>
                            </div>

                            <div
                                className="edu-progress-track"
                                aria-label={`${item.title}: ${item.percent ?? 0}%`}
                                role="progressbar"
                                aria-valuenow={item.percent ?? 0}
                                aria-valuemin={0}
                                aria-valuemax={100}
                            >
                                <span style={{
                                    width: `${item.percent ?? 0}%`
                                }}/>
                            </div>

                            <Link to={`/education/${item.topicId}`}>
                                Explore learning cards
                                <ChevronRight size={18}/>
                            </Link>

                        </article>
                    ))}

                </div>

                <section className="edu-awareness-explainer">

                    <div className="edu-detail-title">

                        <span className="edu-detail-title-icon">
                            <Info size={21}/>
                        </span>

                        <div>
                            <h2>
                                How are awareness levels determined?
                            </h2>

                            <p>
                                Your practice score is calculated
                                separately for each scam category.
                            </p>
                        </div>

                    </div>

                    <div className="edu-level-legend">

                        <div>
                            <span className="edu-level-pill beginner">
                                Beginner
                            </span>
                            <strong>Below 50%</strong>
                            <p>
                                Start with the basics and learn
                                common warning signs.
                            </p>
                        </div>

                        <div>
                            <span className="edu-level-pill developing">
                                Developing
                            </span>
                            <strong>50–79%</strong>
                            <p>
                                Good progress. Keep practising
                                tricky situations.
                            </p>
                        </div>

                        <div>
                            <span className="edu-level-pill confident">
                                Confident
                            </span>
                            <strong>80–100%</strong>
                            <p>
                                Strong awareness. Keep checking
                                unfamiliar requests.
                            </p>
                        </div>

                    </div>

                    <p>
                        Awareness levels improve when you achieve
                        a higher level and decrease by one level
                        only after two consecutive assessments
                        below your current level.
                    </p>

                </section>

                <section className="edu-check-banner edu-awareness-footer">

                    <span className="edu-check-icon">
                        <RotateCcw size={26}/>
                    </span>

                    <div>
                        <h2>Learning never stops</h2>
                        <p>
                            Explore more guides and practise
                            verifying unusual requests.
                        </p>
                    </div>

                    <Link
                        to="/education"
                        className="edu-secondary-button"
                    >
                        Browse education
                        <ArrowRight size={18}/>
                    </Link>

                </section>

                <p className="edu-demo-note">
                    Your awareness results are saved to your account.
                    Learning card completion is currently tracked
                    locally on this device.
                    Awareness results do not affect your bank
                    account balance or reward points.
                </p>

            </div>
        </main>
    );
}

export default Awareness;