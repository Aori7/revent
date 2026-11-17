import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    CircleHelp,
    GraduationCap,
    RotateCcw,
    ShieldCheck
} from 'lucide-react';

import {
    awarenessCategories,
    getAwarenessLevel
} from '../data/educationData';

import {
    getReadinessQuestions,
    submitReadinessQuiz
} from '../services/readinessApi';

import '../css/education.css';

function ReadinessCheck() {
    const [questions, setQuestions] = useState([]);
    const [step, setStep] = useState(0);
    const [answers, setAnswers] = useState({});
    const [results, setResults] = useState(null);

    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [retryCount, setRetryCount] = useState(0);

    const submissionLock = useRef(false);

    const current = questions[step];
    const hasSelected = answers[current?.id] !== undefined;

    // Retrieve questions from the backend
    useEffect(() => {
        let cancelled = false;

        async function loadQuestions() {
            setLoading(true);
            setError('');

            try {
                const data = await getReadinessQuestions();

                if (!Array.isArray(data.questions) ||
                    data.questions.length !== 9) {
                    throw new Error('Unable to load the complete quiz.');
                }

                if (!cancelled) {
                    setQuestions(data.questions);
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

        loadQuestions();

        return () => {
            cancelled = true;
        };
    }, [retryCount]);

    // Submit answers to the backend for grading
    async function submitQuiz() {
        if (submissionLock.current) return;

        if (!questions.every(q => answers[q.id] !== undefined)) {
            setError('Please answer all nine questions.');
            return;
        }

        submissionLock.current = true;
        setIsSubmitting(true);
        setError('');

        try {
            const submittedAnswers = questions.map(question => ({
                question_id: question.id,
                option_id: answers[question.id]
            }));

            const data = await submitReadinessQuiz(
                submittedAnswers
            );

            setResults(data);

        } catch (error) {
            setError(
                error.message || 'Unable to submit quiz.'
            );

        } finally {
            submissionLock.current = false;
            setIsSubmitting(false);
        }
    }

    // Restart the quiz
    function restart() {
        setStep(0);
        setAnswers({});
        setResults(null);
        setError('');
    }

    // Loading state
    if (loading) {
        return (
            <main className="edu-page">
                <div className="edu-container edu-quiz-container">
                    <h2>Loading readiness check...</h2>
                    <p>Retrieving your quiz questions.</p>
                </div>
            </main>
        );
    }

    // Unable to retrieve questions
    if (!current && !results) {
        return (
            <main className="edu-page">
                <div className="edu-container edu-quiz-container">
                    <h2>Unable to load quiz</h2>

                    <p role="alert">
                        {error || 'No questions available.'}
                    </p>

                    <button
                        type="button"
                        className="edu-primary-button"
                        onClick={() => setRetryCount(prev => prev + 1)}
                    >
                        Try again
                    </button>

                    <Link to="/awareness" className="edu-back-link">
                        <ArrowLeft size={18}/>
                        Back to Awareness
                    </Link>
                </div>
            </main>
        );
    }

    // Display results returned by the backend
    if (results) {
        const scores = awarenessCategories.map(category => {
            const score = results.categoryScores[category.code];

            return {
                ...category,
                correct: score.correct,
                max: score.max,
                percentage: score.percentage,
                level: getAwarenessLevel(score.percentage)
            };
        });

        return (
            <main className="edu-page">
                <div className="edu-container edu-quiz-container">

                    <span className="edu-eyebrow">
                        <CheckCircle2 size={18}/>
                        PRACTICE COMPLETE
                    </span>

                    <div className="edu-results-card">
                        <span className="edu-results-icon">
                            <GraduationCap size={34}/>
                        </span>

                        <h1>Your readiness results</h1>

                        <p className="edu-results-number">
                            {results.totalCorrect}
                            <span> / {questions.length}</span>
                        </p>

                        <p>
                            Great job taking time to practise.
                            Your score is a learning guide,
                            not a guarantee that any request is safe.
                        </p>
                    </div>

                    <div className="edu-results-breakdown">
                        <h2>Your scores by scam type</h2>

                        {scores.map(item => (
                            <div key={item.code}>
                                <div>
                                    <strong>{item.title}</strong>

                                    <span className={
                                        `edu-level-pill ${item.level.toLowerCase()}`
                                    }>
                                        {item.level}
                                    </span>
                                </div>

                                <span>
                                    {item.correct}/{item.max} correct
                                    ({item.percentage}%)
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="edu-results-actions">
                        <Link
                            to="/awareness"
                            className="edu-primary-button"
                        >
                            View awareness levels
                            <ArrowRight size={18}/>
                        </Link>

                        <button
                            type="button"
                            className="edu-outline-button"
                            onClick={restart}
                        >
                            <RotateCcw size={18}/>
                            Try again
                        </button>
                    </div>

                    <p className="edu-demo-note">
                        Your results have been securely saved.
                        The levels shown here reflect this attempt.
                        Your personalised awareness levels may differ
                        based on your previous assessments.
                    </p>

                </div>
            </main>
        );
    }

    // Main quiz interface
    return (
        <main className="edu-page">
            <div className="edu-container edu-quiz-container">

                <Link
                    to="/awareness"
                    className="edu-back-link"
                >
                    <ArrowLeft size={18}/>
                    Back to Awareness
                </Link>

                <div className="edu-quiz-header">
                    <span className="edu-eyebrow">
                        <ShieldCheck size={17}/>
                        SCAM READINESS CHECK
                    </span>

                    <h1>Let's test what you know</h1>

                    <p>
                        9 questions · 3 scam categories ·
                        Choose the safest response.
                        “I'm not sure” is always okay.
                    </p>
                </div>

                <div className="edu-quiz-main">

                    <div className="edu-quiz-progress-info">
                        <span>
                            Question {step + 1} of {questions.length}
                        </span>

                        <span>
                            {Math.round(
                                Object.keys(answers).length /
                                questions.length * 100
                            )}% completed
                        </span>
                    </div>

                    <div className="edu-progress-track">
                        <span style={{
                            width: `${
                                Object.keys(answers).length /
                                questions.length * 100
                            }%`
                        }}/>
                    </div>

                    <div className="edu-quiz-question">

                        <span className="edu-quiz-topic">
                            {awarenessCategories.find(
                                entry => entry.code === current.category
                            )?.title}
                        </span>

                        <h2>{current.text}</h2>

                        <fieldset disabled={isSubmitting}>
                            <legend className="edu-visually-hidden">
                                Select your answer
                            </legend>

                            {current.options.map((option, index) => (
                                <label
                                    key={option.id}
                                    className={`edu-quiz-option ${
                                        answers[current.id] === option.id
                                            ? 'selected'
                                            : ''
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name={`question-${current.id}`}
                                        checked={
                                            answers[current.id] === option.id
                                        }
                                        onChange={() =>
                                            setAnswers(previous => ({
                                                ...previous,
                                                [current.id]: option.id
                                            }))
                                        }
                                    />

                                    <span className="edu-quiz-option-letter">
                                        {String.fromCharCode(65 + index)}
                                    </span>

                                    <span>{option.text}</span>

                                    <span className="edu-radio-indicator"/>
                                </label>
                            ))}
                        </fieldset>
                    </div>

                    {error && (
                        <p role="alert">{error}</p>
                    )}

                    <div className="edu-quiz-actions">

                        <button
                            type="button"
                            className="edu-outline-button"
                            onClick={() => setStep(prev => prev - 1)}
                            disabled={step === 0 || isSubmitting}
                        >
                            <ArrowLeft size={17}/>
                            Previous
                        </button>

                        {step === questions.length - 1 ? (
                            <button
                                type="button"
                                className="edu-primary-button"
                                disabled={!hasSelected || isSubmitting}
                                onClick={submitQuiz}
                            >
                                {isSubmitting
                                    ? 'Submitting...'
                                    : 'See my results'}

                                <CheckCircle2 size={18}/>
                            </button>
                        ) : (
                            <button
                                type="button"
                                className="edu-primary-button"
                                disabled={!hasSelected}
                                onClick={() =>
                                    setStep(prev => prev + 1)
                                }
                            >
                                Next question
                                <ArrowRight size={18}/>
                            </button>
                        )}
                    </div>
                </div>

                <div className="edu-quiz-notice">
                    <CircleHelp size={20}/>
                    <p>
                        This check is for learning.
                        In a real transfer, always verify
                        suspicious requests independently.
                    </p>
                </div>
            </div>
        </main>
    );
}

export default ReadinessCheck; 