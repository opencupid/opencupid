import { z } from 'zod';

export const ProfileScalarFieldEnumSchema = z.enum(['id','publicName','country','cityName','isSocialActive','isDatingActive','isActive','isReported','isBlocked','isOnboarded','isCallable','hasFace','userId','work','languages','birthday','gender','pronouns','relationship','hasKids','prefAgeMin','prefAgeMax','prefGender','prefKids','lat','lon','createdAt','updatedAt']);

export default ProfileScalarFieldEnumSchema;
