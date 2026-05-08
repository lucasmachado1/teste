import { useState } from 'react';

export default function AuthPanel({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '' });
  const [message, setMessage] = useState('');

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setMessage('Validando...');
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, ...form })
    });
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.message || 'Erro de autenticação.');
      return;
    }

    onAuth(data.user);
    setMessage('Sessão iniciada.');
  };

  return (
    <form className="authPanel" onSubmit={submit}>
      <div className="segmented">
        <button className={mode === 'login' ? 'selected' : ''} onClick={() => setMode('login')} type="button">Login</button>
        <button className={mode === 'register' ? 'selected' : ''} onClick={() => setMode('register')} type="button">Cadastro</button>
      </div>
      {mode === 'register' && <input value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="Nome completo" />}
      {mode === 'register' && <input value={form.username} onChange={(event) => update('username', event.target.value)} placeholder="@username" />}
      <input value={form.email} onChange={(event) => update('email', event.target.value)} placeholder="E-mail" type="email" />
      <input value={form.password} onChange={(event) => update('password', event.target.value)} placeholder="Senha" type="password" />
      <button className="primaryButton" type="submit">{mode === 'login' ? 'Entrar' : 'Criar conta'}</button>
      {message && <span className="statusText">{message}</span>}
    </form>
  );
}
