-- Add User.emailNotificationsOptIn. Default true so existing users keep
-- receiving notification emails; unsubscribe flips it to false.
ALTER TABLE "User" ADD COLUMN "emailNotificationsOptIn" BOOLEAN NOT NULL DEFAULT true;
