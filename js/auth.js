/**
 * TaskFlow — Auth module (localStorage-based for demo)
 * Note: For production apps, use a real backend with hashed passwords.
 */

const Auth = {
  USERS_KEY: 'taskflow-users',
  SESSION_KEY: 'taskflow-session',
  TODOS_PREFIX: 'taskflow-todos-',

  DEMO_USER: {
    id: 'user-demo',
    name: 'Demo User',
    email: 'demo@taskflow.com',
    password: 'demo123',
  },

  DEMO_TODOS: [
    { id: 'demo-1', text: 'Welcome to TaskFlow!', completed: false, createdAt: new Date().toISOString() },
    { id: 'demo-2', text: 'Click the checkbox to complete a task', completed: false, createdAt: new Date().toISOString() },
    { id: 'demo-3', text: 'Double-click a task to edit it', completed: true, createdAt: new Date().toISOString() },
  ],

  init() {
    const users = this.getUsers();
    const demoExists = users.some((u) => u.email === this.DEMO_USER.email);

    if (!demoExists) {
      users.push({ ...this.DEMO_USER });
      this.saveUsers(users);
      localStorage.setItem(
        this.TODOS_PREFIX + this.DEMO_USER.id,
        JSON.stringify(this.DEMO_TODOS)
      );
    }
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
    this.init();
    if (!this.getSession()) {
      window.location.href = redirectTo;
      return null;
    }
    return this.getSession();
  },

  redirectIfLoggedIn(redirectTo = 'index.html') {
    this.init();
    if (this.getSession()) {
      window.location.href = redirectTo;
    }
  },
};

Auth.init();
