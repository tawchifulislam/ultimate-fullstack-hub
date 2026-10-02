interface User {
  id: number;
  userName: string;
  email: string;
}

// Demo 1: Partial and Required
function updateUser(id: number, updates: Partial<User>): void {
  console.log(`updating user ${id} with`, updates);
}
updateUser(1, { email: 'new@example.com' }); // only the changed field needed

type RequiredUser = Required<{ id?: number; userName?: string }>;
const fullyRequired: RequiredUser = { id: 1, userName: 'Ada' }; // both now mandatory
console.log('\nRequired<T> example:', fullyRequired);

// Demo 2: Readonly, and that it's shallow
interface Wrapper {
  inner: { count: number };
}
const frozen: Readonly<Wrapper> = { inner: { count: 0 } };
// frozen.inner = { count: 1 }; // would NOT compile: readonly
frozen.inner.count = 99; // DOES compile: Readonly is shallow, nested objects aren't protected
console.log('\nReadonly is shallow, nested mutation still allowed:', frozen);

// Demo 3: Pick and Omit
type UserPreview = Pick<User, 'id' | 'userName'>;
type UserWithoutEmail = Omit<User, 'email'>;
const preview: UserPreview = { id: 1, userName: 'Ada' };
const noEmail: UserWithoutEmail = { id: 1, userName: 'Ada' };
console.log('\nPick result:', preview);
console.log('Omit result:', noEmail);

// Demo 4: Record
type StatusMessages = Record<'success' | 'error' | 'loading', string>;
const messages: StatusMessages = {
  success: 'Done!',
  error: 'Something went wrong',
  loading: 'Working on it...',
};
console.log('\nRecord result:', messages);

// Demo 5: Exclude and Extract on unions
type Status = 'pending' | 'active' | 'done' | 'archived';
type ActiveStatus = Exclude<Status, 'archived'>;
type FinishedStatus = Extract<Status, 'done' | 'archived'>;
const active: ActiveStatus = 'pending';
const finished: FinishedStatus = 'done';
console.log(
  '\nExclude-typed value:',
  active,
  '| Extract-typed value:',
  finished,
);

// Demo 6: NonNullable
type MaybeId = string | number | null | undefined;
function requireId(id: NonNullable<MaybeId>): string {
  return `id is: ${id}`;
}
console.log('\n' + requireId(42));
// requireId(null); // would NOT compile: null is not assignable to NonNullable<MaybeId>

// Demo 7: ReturnType and Parameters
function createUser(userName: string, email: string) {
  return { id: 1, userName, email };
}
type CreatedUser = ReturnType<typeof createUser>;
type CreateUserArgs = Parameters<typeof createUser>;

const derivedUser: CreatedUser = {
  id: 2,
  userName: 'Grace',
  email: 'grace@example.com',
};
const args: CreateUserArgs = ['Grace', 'grace@example.com'];
console.log('\nReturnType-derived value:', derivedUser);
console.log('Parameters-derived tuple:', args);

// Demo 8: the Partial gotcha, combining Pick and Partial for a safer update type
interface Config {
  apiKey: string;
  timeout: number;
  retries: number;
}
type ConfigUpdate = Pick<Config, 'apiKey'> & Partial<Omit<Config, 'apiKey'>>;
const safeUpdate: ConfigUpdate = { apiKey: 'secret' }; // apiKey required, the rest optional
console.log('\ncombined Pick & Partial update:', safeUpdate);
// const unsafeUpdate: ConfigUpdate = { timeout: 5000 }; // would NOT compile: apiKey missing
