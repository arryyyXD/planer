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
import { z } from "zod";

type AuthMode = "login" | "register";

interface AuthFormProps {
  onAuthSuccess: () => void;
}

// Валидационная схема
const authSchema = z.object({
  email: z.string().email("Некорректный email"),
  password: z.string().min(8, "Пароль должен содержать минимум 8 символов"),
  name: z.string().optional(),
});

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
    const input = { email, password, name: username };

    const result = authSchema.safeParse(input);
    if (!result.success) {
      const message = result.error.errors[0].message;
      setError(message);
      return;
    }

    const url = `https://app-planer.online/users/${authMode}`;
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
    <Container size={420} my={40} style={{ backgroundColor: '#B92E3B', padding: '35px', borderRadius: '12px' }}>
      <Text color="#B92E3B" size="xl">{authMode === "login" ? "Вход" : "Регистрация"}</Text>

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
              onClose={() => setError(null)} 
            >
              {error}
            </Notification>
          )}

        <Button fullWidth mt="xl" onClick={handleSubmit} color="#B92E3B">
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
