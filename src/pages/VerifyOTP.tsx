import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { verifyOTP, sendOTP } from '../services/auth';
import { useAuth } from '../context/AuthContext';

export default function VerifyOTP() {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  
  const location = useLocation();
  const navigate = useNavigate();
  const { refreshSession } = useAuth();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const email = location.state?.email;
  const isCustom = location.state?.isCustom;

  useEffect(() => {
    if (!email) {
      navigate('/login');
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [email, navigate]);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) {
      const chars = value.split('').slice(0, 6);
      const newOtp = [...otp];
      chars.forEach((char, i) => {
        if (index + i < 6) newOtp[index + i] = char;
      });
      setOtp(newOtp);
      const nextFocus = Math.min(index + chars.length, 5);
      inputRefs.current[nextFocus]?.focus();
      return;
    }

    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto focus next
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const submitOTP = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      toast.error('Please enter a 6-digit code');
      return;
    }

    setIsLoading(true);
    try {
      await verifyOTP(email, otpCode, isCustom);
      toast.success('Successfully verified!');
      // Force refresh session state in context
      await refreshSession();
      navigate('/home');
    } catch (error: any) {
      toast.error(`Verification failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const resendOTP = async () => {
    if (timeLeft > 0) return;
    setIsLoading(true);
    try {
      await sendOTP(email);
      setTimeLeft(300);
      toast.success('New OTP sent');
    } catch (error: any) {
      toast.error('Failed to resend OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!email) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md relative">
        <button 
          onClick={() => navigate(-1)}
          className="absolute top-6 left-6 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          <ArrowLeft size={20} className="text-gray-600" />
        </button>

        <div className="flex flex-col items-center mt-6 mb-8 pt-4">
          <div className="p-4 bg-primary/10 rounded-full mb-4">
            <Mail size={40} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Check your email</h1>
          <p className="text-gray-600 mt-2 text-center text-sm">
            We've sent a 6-digit verification code to
            <br />
            <span className="font-semibold text-gray-800">{email}</span>
          </p>
        </div>

        <div className="flex justify-between gap-2 mb-8">
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="w-12 h-14 text-center text-2xl font-bold rounded-xl border border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary focus:outline-none transition-all"
            />
          ))}
        </div>

        <button
          onClick={submitOTP}
          disabled={isLoading || otp.join('').length !== 6}
          className="w-full bg-gradient-to-br from-primary to-primary-dark text-white font-semibold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-70 flex justify-center items-center"
        >
          {isLoading ? (
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            'Verify Email'
          )}
        </button>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            {timeLeft > 0 ? (
              <>
                Resend code in <span className="font-semibold text-primary">{formatTime(timeLeft)}</span>
              </>
            ) : (
              <>
                Didn't receive the code?{' '}
                <button
                  onClick={resendOTP}
                  disabled={isLoading}
                  className="font-semibold text-primary hover:text-primary-dark transition-colors"
                >
                  Resend now
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
