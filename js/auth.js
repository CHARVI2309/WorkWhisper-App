/**
 * Work Whisper — Auth module (localStorage-based)
 * Note: For production apps, use a real backend with hashed passwords.
 */

const Auth = {
  USERS_KEY: 'workwhisper-users',
  SESSION_KEY: 'workwhisper-session',
  TODOS_PREFIX: 'workwhisper-todos-',

  init() {
    // No demo user — users must sign up
  },

  getUsers() {
    try {
      const stored = localStorage.getItem(this.USERS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  saveUsers(users) {
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
  },

  getSession() {
    try {
      const stored = localStorage.getItem(this.SESSION_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },

  setSession(user) {
    const session = { userId: user.id, name: user.name, email: user.email };
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
    return session;
  },

  clearSession() {
    localStorage.removeItem(this.SESSION_KEY);
  },

  getTodosKey(userId) {
    return this.TODOS_PREFIX + userId;
  },

  validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  signup(name, email, password, confirmPassword) {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName || trimmedName.length < 2) {
      return { success: false, message: 'Name must be at least 2 characters' };
    }

    if (!this.validateEmail(trimmedEmail)) {
      return { success: false, message: 'Please enter a valid email address' };
    }

    if (password.length < 6) {
      return { success: false, message: 'Password must be at least 6 characters' };
    }

    if (password !== confirmPassword) {
      return { success: false, message: 'Passwords do not match' };
    }

    const users = this.getUsers();
    if (users.some((u) => u.email === trimmedEmail)) {
      return { success: false, message: 'An account with this email already exists' };
    }

    const newUser = {
      id: 'user-' + Date.now().toString(36),
      name: trimmedName,
      email: trimmedEmail,
      password,
    };

    users.push(newUser);
    this.saveUsers(users);
    this.setSession(newUser);

    return { success: true, message: 'Account created successfully!' };
  },

  login(email, password) {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !password) {
      return { success: false, message: 'Please enter email and password' };
    }

    const user = this.getUsers().find(
      (u) => u.email === trimmedEmail && u.password === password
    );

    if (!user) {
      return { success: false, message: 'Invalid email or password' };
    }

    this.setSession(user);
    return { success: true, message: `Welcome back, ${user.name}!` };
  },

  logout() {
    this.clearSession();
    window.location.href = 'login.html';
  },

  requireAuth(redirectTo = 'login.html') {
    if (!this.getSession()) {
      window.location.href = redirectTo;
      return null;
    }
    return this.getSession();
  },

  redirectIfLoggedIn(redirectTo = 'index.html') {
    if (this.getSession()) {
      window.location.href = redirectTo;
    }
  },
};
