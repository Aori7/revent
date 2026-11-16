
import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { getCurrentUser } from '../services/authApi';

export default function ProtectedRoute({ children }) {
    const [authStatus, setAuthStatus] = useState('checking');

    useEffect(() => {
        const controller = new AbortController();
        const token = sessionStorage.getItem('reventAccessToken');

        // No token means the customer is not logged in
        if (!token) {
            setAuthStatus('unauthenticated');
            return;
        }

        async function verifySession() {
            try {
                await getCurrentUser(token, controller.signal);

                if (!controller.signal.aborted) {
                    setAuthStatus('authenticated');
                }
            } catch (error) {
                if (controller.signal.aborted) return;

                if (error.status === 401) {
                    // Remove an invalid or expired token
                    sessionStorage.removeItem('reventAccessToken');
                    setAuthStatus('unauthenticated');
                } else {
                    setAuthStatus('error');
                }
            }
        }

        verifySession();

        return () => controller.abort();
    }, []);

    if (authStatus === 'checking') {
        return <p>Verifying your session...</p>;
    }

    if (authStatus === 'error') {
        return (
            <main>
                <p>Unable to verify your session.</p>
                <p>Please check that your backend is running and refresh.</p>
            </main>
        );
    }

    if (authStatus === 'unauthenticated') {
        return <Navigate to="/login" replace />;
    }

    return children ?? <Outlet />;
}
