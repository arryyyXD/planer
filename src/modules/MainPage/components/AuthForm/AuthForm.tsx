import { useState, useEffect } from "react";

import {
  TextInput,
  PasswordInput,
  Paper,
  Title,
  Container,
  Button,
  Group,
  Anchor,
  Stack,
  Notification,
} from "@mantine/core";
import { IconX } from "@tabler/icons-react";

type AuthMode = "login" | "register";

interface AuthFormProps {
  onAuthSuccess: () => void;
}

const AuthForm = ({ onAuthSuccess }: AuthFormProps) => {
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      onAuthSuccess();
    }
  }, [onAuthSuccess]);

  const toggleMode = () => {
    setAuthMode((mode) => (mode === "login" ? "register" : "login"));
    setError(null);
  };

  const handleSubmit = async () => {
    const url = `https://150.241.86.204:8000/users/${authMode}`;
    const body =
      authMode === "register"
        ? { email, password, name: username }
        : { email, password };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok) {
        const token = data.data?.access_token;
        if (token) {
          localStorage.setItem("access_token", token);
          localStorage.setItem("user_email", data.data.email);
          console.log(localStorage.getItem("access_token"))
          onAuthSuccess();
        } else if (authMode === "register") {
          toggleMode();
        }
      } else {
        setError(data.detail || "Ошибка входа/регистрации");
      }
    } catch (err) {
      setError("Ошибка сети");
    }
  };

  return (
    <Container size={420} my={40} style={{ backgroundColor: '#c487ed', padding: '35px', borderRadius: '12px'}}>
      <Title>
        {authMode === "login" ? "Вход" : "Регистрация"}
      </Title>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <Stack>
          {authMode === "register" && (
            <TextInput
              label="Имя пользователя"
              placeholder="yourname"
              value={username}
              onChange={(e) => setUsername(e.currentTarget.value)}
              required
              error={authMode === "register" && username.trim() === "" ? "Введите имя" : undefined}
            />
          )}

          <TextInput
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            required
          />

          <PasswordInput
            label="Пароль"
            placeholder="Ваш пароль"
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            required
          />
        </Stack>

        {error && (
          <Notification
            color="red"
            title="Ошибка"
            icon={<IconX size={16} />}
            mt="md"
          >
            {error}
          </Notification>
        )}

        <Button fullWidth mt="xl" onClick={handleSubmit}>
          {authMode === "login" ? "Войти" : "Зарегистрироваться"}
        </Button>

        <Group mt="md">
          <Anchor component="button" size="sm" onClick={toggleMode}>
            {authMode === "login"
              ? "Нет аккаунта? Зарегистрируйтесь"
              : "Уже есть аккаунт? Войдите"}
          </Anchor>
        </Group>
      </Paper>
    </Container>
  );
};

export default AuthForm;
