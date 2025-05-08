import { useEffect, useState } from "react";
import CalendarWithTasks from "./components/CalendarWithTasks/CalendarWithTasks";
import AuthForm from "./components/AuthForm/AuthForm";
import { Button, Group } from "@mantine/core";

const MainPage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    setIsAuthenticated(!!token);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_email");
    setIsAuthenticated(false);
  };

  return isAuthenticated ? (
    <>
      <Group mr="md">
        <Button variant="light" color="red" style={{ position: "fixed", right: '5%', top: "3%"}} onClick={handleLogout}>
          Выйти
        </Button>
      </Group>
      <CalendarWithTasks />
    </>
  ) : (
    <AuthForm onAuthSuccess={() => setIsAuthenticated(true)} />
  );
};

export default MainPage;
