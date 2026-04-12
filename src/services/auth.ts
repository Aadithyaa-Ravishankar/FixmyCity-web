import { supabase } from '../supabase';

export const sendOTP = async (email: string, displayName?: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        data: {
          type: 'email_otp',
          display_name: displayName,
        },
      },
    });

    if (error) {
      throw error;
    }

    return { success: true, message: 'OTP sent successfully' };
  } catch (error: any) {
    console.error('Error sending native OTP:', error);
    // Fallback: Send custom OTP via Edge function like Flutter app does
    return sendCustomOTP(email);
  }
};

const sendCustomOTP = async (email: string) => {
  try {
    // Generate 6 digit code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 5 * 60000).toISOString();

    const { data, error: dbError } = await supabase
      .from('otp_verifications')
      .insert({
        identifier: email,
        otp_code: otp,
        type: 'email',
        expires_at: expiry,
        status: 'pending',
      })
      .select()
      .single();

    if (dbError) throw dbError;

    // Call edge function
    await supabase.functions.invoke('send-email', {
      body: {
        email,
        subject: 'Your FixmyCity OTP Code',
        message: `Your OTP code is: ${otp}. This code will expire in 5 minutes. Please enter this code in the app to verify your email address.`,
        otp,
      },
    });

    return { success: true, isCustom: true };
  } catch (err) {
    console.error('Custom OTP fallback failed:', err);
    throw new Error('Failed to send email OTP');
  }
};

export const verifyOTP = async (email: string, token: string, isCustom = false) => {
  try {
    if (isCustom) {
      // Use the database verify function
      const { data, error } = await supabase.rpc('verify_otp_code', {
        p_identifier: email,
        p_otp_code: token,
      });

      if (error) throw error;
      if (!data || data[0].success === false) {
        throw new Error(data[0].message || 'Invalid OTP');
      }

      // If successful, how do we log in? 
      // The RPC verifies the OTP. We need to create a session if using custom.
      // Easiest is to sign in via magic link or a set password if we set one.
      // For this simplified logic we will rely on native OTP if possible, 
      // or instruct the user to use the password they set.
      return { success: true, user: data[0].user_id, session: null };
    } else {
      // Native Supabase verification
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });

      if (error) throw error;

      return { success: true, user: data.user, session: data.session };
    }
  } catch (error: any) {
    console.error('OTP check failed:', error);
    throw new Error(error.message);
  }
};
