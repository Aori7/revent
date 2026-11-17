import { useState } from 'react';
import { Link } from 'react-router-dom';
import ReventLogo from '../components/ReventLogo';
import '../css/login.css';
import { registerCustomer } from '../services/authApi';

export default function Signup() {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [registrationComplete, setRegistrationComplete] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        if (isSubmitting || registrationComplete) return;

        setMessage('');

        // Validate full name
        if (!fullName.trim()) {
            setMessage('Please enter your full name.');
            return;
        }

        // Validate email
        if (!email.trim()) {
            setMessage('Please enter your email address.');
            return;
        }

        // Validate PIN
        if (!/^\d{6}$/.test(pin)) {
            setMessage('PIN must contain exactly 6 digits.');
            return;
        }

        // Confirm PIN
        if (pin !== confirmPin) {
            setMessage('PINs do not match.');
            return;
        }

        setIsSubmitting(true);

        try {
            // Send registration details to Express
            const result = await registerCustomer(
                fullName.trim(),
                email.trim(),
                pin
            );

            setRegistrationComplete(true);
            setMessage(result.message);

            // Clear sensitive fields
            setFullName('');
            setEmail('');
            setPin('');
            setConfirmPin('');

        } catch (error) {
            setMessage(error.message || 'Registration failed.');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <main className="login-page signup-page">
            <div className="login-content">
                <div className="login-card">
                    <ReventLogo />

                    <h1>Create Your Account</h1>

                    <form onSubmit={handleSubmit}>
                        <label htmlFor="signup-name">
                            Full Name
                        </label>
                        <input
                            id="signup-name"
                            type="text"
                            placeholder="Enter Full Name"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            maxLength={120}
                            autoComplete="name"
                            required
                        />

                        <label htmlFor="signup-email">
                            Email Address
                        </label>
                        <input
                            id="signup-email"
                            type="email"
                            placeholder="Enter Email Address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            maxLength={254}
                            autoComplete="email"
                            required
                        />

                        <label htmlFor="signup-pin">
                            Create PIN
                        </label>
                        <input
                            id="signup-pin"
                            type="password"
                            placeholder="Enter 6-digit PIN"
                            value={pin}
                            onChange={(e) =>
                                setPin(
                                    e.target.value
                                        .replace(/\D/g, '')
                                        .slice(0, 6)
                                )
                            }
                            inputMode="numeric"
                            maxLength={6}
                            autoComplete="new-password"
                            required
                        />

                        <label htmlFor="signup-confirm-pin">
                            Confirm PIN
                        </label>
                        <input
                            id="signup-confirm-pin"
                            type="password"
                            placeholder="Confirm your 6-digit PIN"
                            value={confirmPin}
                            onChange={(e) =>
                                setConfirmPin(
                                    e.target.value
                                        .replace(/\D/g, '')
                                        .slice(0, 6)
                                )
                            }
                            inputMode="numeric"
                            maxLength={6}
                            autoComplete="new-password"
                            required
                        />

                        {message && (
                            <p
                                className={registrationComplete ? 'signup-success' : 'login-error'}
                                role="status"
                            >
                                {message}
                            </p>
                        )}

                        <button
                            type="submit"
                            className="login-submit"
                            disabled={isSubmitting || registrationComplete}
                        >
                            {isSubmitting
                                ? 'Creating Account...'
                                : registrationComplete
                                    ? 'Registration Submitted'
                                    : 'Sign Up'}
                        </button>
                    </form>
                </div>

                <p className="login-register">
                    Already have an account?{' '}
                    <Link to="/login">Log In</Link>
                </p>
            </div>

            <footer className="login-footer">
                @Revent. All Rights Reserved. Conditions of Access | Policies | Security | Need Help?
            </footer>
        </main>
    );
}
