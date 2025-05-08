import {
  ActionIcon,
  Button,
  Collapse,
  Menu,
  Paper,
  Select,
  Stack,
  Text,
  Textarea,
  Title,
  Modal,
  TextInput,
} from "@mantine/core";
import {
  IconAlignLeft,
  IconCategory,
  IconChevronLeft,
  IconChevronRight,
  IconCircle,
  IconCircleCheck,
  IconDotsVertical,
  IconPencil,
  IconX,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import "dayjs/locale/ru";
import { useEffect, useState, type FormEventHandler } from "react";
import { useTasks } from "../../../../store/useTasks";
import styles from "./CalendarWithTasks.module.css";
import { Calendar, TimePicker } from "@mantine/dates";
import { showNotification } from "@mantine/notifications";
import { useDisclosure } from "@mantine/hooks";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);
dayjs.locale("ru");

const initialCategories = ["Работа", "Учёба", "Дом", "Другое"];

const CalendarWithTasks = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [taskTitle, setTaskTitle] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [customCategory, setCustomCategory] = useState("");
  const [categories, setCategories] = useState(initialCategories);
  const [baseYear, setBaseYear] = useState(
    dayjs(selectedDate).year() - (dayjs(selectedDate).year() % 4)
  );
  const [calendarRerenderKey, setCalendarRerenderKey] = useState(0);
  const tasks = useTasks((s) => s.tasks);
  const addTask = useTasks((s) => s.addTask);
  const toggleTask = useTasks((s) => s.toggleTask);
  const [taskDescription, setTaskDescription] = useState("");
  const dateKey = dayjs(selectedDate).format("YYYY-MM-DD");
  const [openedTasks, setOpenedTasks] = useState<Record<string, boolean>>({});
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [opened, { open, close }] = useDisclosure(false);
  const updateTask = useTasks((s) => s.updateTask);

  const formatDateToTimeString = (date: Date | null): string =>
    date
      ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "";

  const [notificationTime, setNotificationTime] = useState<Date | null>(null);

  const toggleTaskOpen = (taskId: string) => {
    setOpenedTasks((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  useEffect(() => {
    const fetchNotes = async () => {
      const token = localStorage.getItem("access_token");

      try {
        const res = await fetch("https://app-planer.online/notes", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const notes = await res.json();
        if (!Array.isArray(notes)) {
          throw new Error("Неверный формат ответа: ожидался массив");
        }

        notes.forEach((note) => {
          const dateKey = dayjs(note.date).format("YYYY-MM-DD");
          const existing = tasks[dateKey]?.find(
            (t) => t.id === note.id.toString()
          );
          if (!existing) {
            addTask(dateKey, {
              id: note.id.toString(),
              title: note.title || "Без названия",
              description: note.description || "",
              category: note.properties?.category || "Без категории",
              done: note.done ?? true,
              time: note.notifications[0]?.time || null,
            });
          }
        });
        await fetchTasksForDate(dayjs(selectedDate).format("YYYY-MM-DD"));
      } catch (err) {
        console.error("Ошибка при загрузке заметок", err);
        showNotification({
          title: "Ошибка",
          message: "Не удалось загрузить заметки",
          color: "red",
          icon: <IconX size={16} />,
        });
      }
    };

    fetchNotes();
  }, []);

  const handleTimeChange = (value: string) => {
    const newTime = value ? new Date(`1970-01-01T${value}:00`) : null;
    setNotificationTime(newTime);
  };

  const timeString = notificationTime
    ? notificationTime.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const handleAddTask = async () => {
    if (!taskTitle) {
      showNotification({
        title: "Ошибка",
        message: "Пожалуйста, введите название задачи.",
        color: "red",
        icon: <IconX size={16} />,
      });
      return;
    }

    const newCategory =
      selectedCategory === "new" ? customCategory.trim() : selectedCategory;
    if (
      selectedCategory === "new" &&
      customCategory &&
      !categories.includes(customCategory)
    ) {
      setCategories((prevCategories) => [...prevCategories, customCategory]);
    }

    console.log("notificationTime:", notificationTime);

    const currentDate = dayjs().format("YYYY-MM-DD");

    const notificationISOString =
      notificationTime && dayjs(`${currentDate}T${notificationTime}`).isValid()
        ? dayjs.utc(`${currentDate}T${notificationTime}`).local().toISOString()
        : null;

    console.log("notificationISOString:", notificationISOString);

    const notePayload = {
      title: taskTitle,
      description: taskDescription,
      date: new Date(selectedDate).toISOString(),
      properties: {
        category: newCategory || "Без категории",
      },
      notification: {
        title: "Напоминание о задании",
        time: notificationISOString,
      },
    };

    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch("https://app-planer.online/notes/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(notePayload),
      });

      if (!res.ok) {
        console.error("Failed to create task", await res.json());
        return;
      }

      const data = await res.json();
      console.log("Note created:", data);

      addTask(dayjs(selectedDate).format("YYYY-MM-DD"), {
        id: data.data.id.toString(),
        description: data.description,
        title: data.title,
        category: newCategory || "Без категории",
        done: data.done,
      });

      await fetchTasksForDate(dayjs(selectedDate).format("YYYY-MM-DD"));

      setTaskTitle("");
      setCustomCategory("");
      setSelectedCategory(null);
    } catch (error) {
      console.error("Ошибка при создании заметки", error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const token = localStorage.getItem("access_token");

    try {
      const res = await fetch(
        `https://app-planer.online/notes/delete/${taskId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.ok) {
        showNotification({
          title: "Удалено",
          message: "Задача была удалена.",
          color: "green",
        });
      } else {
        console.error("Failed to delete task");
      }
    } catch (err) {
      console.error("Failed to delete task", err);
    }
  };

  const renderTaskActions = (taskId: string) => (
    <Menu shadow="md" width={200} radius="md">
      <Menu.Target>
        <div
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <ActionIcon variant="subtle" color="dark" radius="xl">
            <IconDotsVertical size={18} />
          </ActionIcon>
        </div>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          onClick={(e) => {
            e.stopPropagation();
            toggleTask(dateKey, taskId);
          }}
        >
          Переключить статус
        </Menu.Item>
        <Menu.Item
          onClick={(e) => {
            e.stopPropagation();
            handleEditTask(taskId);
          }}
        >
          Изменить
        </Menu.Item>
        <Menu.Item
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteTask(taskId);
          }}
        >
          Удалить
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );

  const handlePrevMonth = () => {
    setSelectedDate(dayjs(selectedDate).subtract(1, "month").toDate());
    forceRerenderCalendar();
  };

  const handleNextMonth = () => {
    setSelectedDate(dayjs(selectedDate).add(1, "month").toDate());
    forceRerenderCalendar();
  };

  const getYearRange = (start: number) => {
    return Array.from({ length: 4 }, (_, i) => start + i);
  };

  const handlePrevYears = () => setBaseYear((prev) => prev - 4);
  const handleNextYears = () => setBaseYear((prev) => prev + 4);
  const forceRerenderCalendar = () => {
    setCalendarRerenderKey((k) => k + 1);
  };

  const currentMonthName = dayjs(selectedDate).format("MMMM");

  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskCategory, setNewTaskCategory] = useState<string | null>(null);

  const handleEditTask = (taskId: string) => {
    setCurrentTaskId(taskId);
    const task = tasks[dateKey]?.find((t) => t.id === taskId);
    if (task) {
      setNewTaskTitle(task.title);
      setNewTaskDescription(task.description);
      setNewTaskCategory(task.category);
    }
    open();
  };

  const handleSaveTitleChange = async () => {
    if (currentTaskId && newTaskTitle) {
      try {
        const token = localStorage.getItem("access_token");

        const notificationISOString = notificationTime
          ? dayjs(notificationTime).isValid()
            ? dayjs.utc(notificationTime).toISOString()
            : null
          : null;

        const notePayload = {
          title: newTaskTitle,
          description: newTaskDescription,
          done: false,
          date: new Date(selectedDate).toISOString(),
          properties: { category: newTaskCategory || "" },
          notification: {
            title: "Напоминание о задании",
            time: notificationISOString,
          },
        };

        const res = await fetch(
          `https://app-planer.online/notes/update/${currentTaskId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(notePayload),
          }
        );

        if (!res.ok) {
          console.error("Error updating note", await res.json());
          return;
        }

        if (!tasks[dateKey]) {
          tasks[dateKey] = [];
        }

        updateTask(dateKey, {
          id: currentTaskId,
          title: newTaskTitle,
          description: newTaskDescription,
          category: newTaskCategory || "Без категории",
          done: false,
          time: notificationISOString,
        });

        await fetchTasksForDate(dayjs(selectedDate).format("YYYY-MM-DD"));

        close();
        setNewTaskTitle("");
        setNewTaskDescription("");
        setNewTaskCategory(null);
        setNotificationTime(null);
        setCurrentTaskId(null);
      } catch (err) {
        console.error("Failed to update task", err);
      }
    }
  };

  const fetchTasksForDate = async (dateKey: string) => {
    const token = localStorage.getItem("access_token");

    try {
      const res = await fetch(
        `https://app-planer.online/notes?date=${dateKey}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const notes = await res.json();
      if (!Array.isArray(notes)) {
        throw new Error("Неверный формат ответа: ожидался массив");
      }

      notes.forEach((note) => {
        const dateKey = dayjs(note.date).format("YYYY-MM-DD");
        const existing = tasks[dateKey]?.find(
          (t) => t.id === note.id.toString()
        );
        if (!existing) {
          addTask(dateKey, {
            id: note.id.toString(),
            title: note.title || "Без названия",
            description: note.description || "",
            category: note.properties?.category || "Без категории",
            done: note.done ?? true,
            time: note.notifications[0]?.time || null,
          });
        }
      });
    } catch (err) {
      console.error("Ошибка при загрузке заметок", err);
      showNotification({
        title: "Ошибка",
        message: "Не удалось загрузить заметки",
        color: "red",
        icon: <IconX size={16} />,
      });
    }
  };

  return (
    <>
      <Modal
        opened={opened}
        onClose={close}
        title="Редактировать задачу"
        withinPortal={false}
        size="lg"
        radius="lg"
        transitionProps={{
          transition: "pop",
          duration: 300,
          timingFunction: "ease-in-out",
        }}
        styles={{
          header: {
            borderBottom: "1px solid #e2e8f0",
            paddingBottom: "1rem",
            marginBottom: "1.5rem",
          },
          title: {
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "#B92E3B",
          },
          content: {
            backgroundColor: "#f8f9fa",
          },
        }}
      >
        <Stack>
          <TextInput
            label="Название задачи"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.currentTarget.value)}
            leftSection={<IconPencil size={18} />}
            radius="md"
            variant="filled"
            styles={{
              label: {
                fontWeight: 600,
                marginBottom: 4,
                color: "#2d3748",
              },
              input: {
                border: "1px solid #e2e8f0",
                backgroundColor: "white",
                "&:focus": {
                  borderColor: "#B92E3B",
                  boxShadow: "0 0 0 2px rgba(185, 46, 59, 0.2)",
                },
              },
            }}
          />

          <Textarea
            label="Описание задачи"
            value={newTaskDescription}
            onChange={(e) => setNewTaskDescription(e.currentTarget.value)}
            autosize
            minRows={2}
            leftSection={<IconAlignLeft size={18} />}
            radius="md"
            variant="filled"
            styles={{
              label: {
                fontWeight: 600,
                marginBottom: 4,
                color: "#2d3748",
              },
              input: {
                border: "1px solid #e2e8f0",
                backgroundColor: "white",
                "&:focus": {
                  borderColor: "#B92E3B",
                  boxShadow: "0 0 0 2px rgba(185, 46, 59, 0.2)",
                },
              },
            }}
          />
          <TimePicker value={timeString} onChange={handleTimeChange} />

          <Select
            label="Категория"
            value={newTaskCategory}
            onChange={setNewTaskCategory}
            data={categories.map((c) => ({ value: c, label: c }))}
            leftSection={<IconCategory size={18} />}
            radius="md"
            variant="filled"
            styles={{
              label: {
                fontWeight: 600,
                marginBottom: 4,
                color: "#2d3748",
              },
              input: {
                border: "1px solid #e2e8f0",
                backgroundColor: "white",
                "&:focus": {
                  borderColor: "#B92E3B",
                  boxShadow: "0 0 0 2px rgba(185, 46, 59, 0.2)",
                },
              },
            }}
          />

          <Button
            onClick={handleSaveTitleChange}
            fullWidth
            size="md"
            radius="md"
            style={{
              backgroundColor: "#B92E3B",
              fontWeight: 600,
              letterSpacing: "0.5px",
              transition: "all 0.2s ease",
              marginTop: "1rem",
            }}
            styles={{
              label: { color: "white" },
              root: {
                "&:hover": {
                  backgroundColor: "#A22935",
                  transform: "translateY(-1px)",
                },
                "&:active": { transform: "translateY(0)" },
              },
            }}
          >
            Сохранить изменения
          </Button>
        </Stack>
      </Modal>
      <div className={styles.wrapper}>
        <div className={styles.leftPanel}>
          <div className={styles.topNavigation}>
            <ActionIcon
              variant="subtle"
              onClick={handlePrevMonth}
              className={styles.navButton}
            >
              <IconChevronLeft size={20} />
            </ActionIcon>
            <Text className={styles.navigationLabel}>{currentMonthName}</Text>
            <ActionIcon
              variant="subtle"
              onClick={handleNextMonth}
              className={styles.navButton}
            >
              <IconChevronRight size={20} />
            </ActionIcon>
          </div>

          <div className={styles.yearSelector}>
            <ActionIcon variant="subtle" onClick={handlePrevYears}>
              <IconChevronLeft size={18} />
            </ActionIcon>
            {getYearRange(baseYear).map((year) => (
              <span
                key={year}
                className={`${styles.yearTab} ${
                  dayjs(selectedDate).year() === year ? styles.activeTab : ""
                }`}
                onClick={() =>
                  setSelectedDate(
                    dayjs()
                      .set("year", year)
                      .set("month", 0)
                      .set("date", 1)
                      .toDate()
                  )
                }
              >
                {year}
              </span>
            ))}
            <ActionIcon variant="subtle" onClick={handleNextYears}>
              <IconChevronRight size={18} />
            </ActionIcon>
          </div>

          <Calendar
            key={calendarRerenderKey}
            onChange={
              ((date: string) => {
                const newDate = new Date(date); // Преобразуем строку в Date
                setSelectedDate(newDate);
              }) as unknown as FormEventHandler<HTMLDivElement>
            }
            styles={{
              day: { fontSize: 18, height: 50, width: 50, borderRadius: 999 },
              weekday: { fontSize: 16, color: "#666" },
              calendarHeader: {
                fontSize: 18,
                padding: "0.5rem",
                margin: "0 auto",
                display: "none",
              },
              calendarHeaderLevel: { fontSize: 18 },
              calendarHeaderControl: { fontSize: 18, width: 32, height: 32 },
            }}
            getDayProps={(date) => {
              const key = dayjs(date).format("YYYY-MM-DD");
              const hasTask = tasks[key]?.length > 0;
              const isSelected = dayjs(date).isSame(selectedDate, "day");
              return {
                className: `${isSelected ? styles.selectedDay : ""} ${
                  hasTask ? styles.indicator : ""
                }`,
                onClick: () => setSelectedDate(new Date(date)), // Преобразуем строку обратно в Date
              };
            }}
            renderDay={(date) => {
              const day = dayjs(date).date();
              const key = dayjs(date).format("YYYY-MM-DD");
              return (
                <div style={{ position: "relative" }} key={`day-${key}`}>
                  {day}
                  {tasks[key]?.length > 0 && <div className={styles.taskDot} />}
                </div>
              );
            }}
          />
        </div>

        <div className={styles.rightPanel}>
          <div className={styles.header}>
            <ActionIcon
              variant="filled"
              color="#B92E3B"
              radius="xl"
              onClick={() =>
                setSelectedDate(dayjs(selectedDate).subtract(1, "day").toDate())
              }
            >
              <IconChevronLeft size={18} />
            </ActionIcon>
            <div className={styles.dateInfo}>
              <Title order={2} className={styles.dateLarge}>
                {dayjs(selectedDate).format("D MMMM")}
              </Title>
              <Text className={styles.weekday}>
                {dayjs(selectedDate).format("dddd")}
              </Text>
            </div>
            <ActionIcon
              variant="filled"
              color="#B92E3B"
              radius="xl"
              onClick={() =>
                setSelectedDate(dayjs(selectedDate).add(1, "day").toDate())
              }
            >
              <IconChevronRight size={18} />
            </ActionIcon>
          </div>

          <Text className={styles.taskInfo}>
            {tasks[dateKey]?.length || 0} задач —{" "}
            {tasks[dateKey]?.filter((t) => !t.done).length || 0} активных
          </Text>

          <Stack>
            <TextInput
              radius="md"
              placeholder="Название задачи"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.currentTarget.value)}
            />
            <TimePicker
              label="Время уведомления"
              value={formatDateToTimeString(notificationTime)}
              onChange={(val) => {
                const [hours, minutes] = val.split(":").map(Number);
                const newDate = new Date();
                newDate.setHours(hours);
                newDate.setMinutes(minutes);
                setNotificationTime(newDate);
              }}
            />
            <Select
              radius="md"
              placeholder="Категория"
              data={[
                ...categories.map((c) => ({ value: c, label: c })),
                { value: "new", label: "➕ Своя категория" },
              ]}
              value={selectedCategory}
              onChange={setSelectedCategory}
              clearable
            />
            {selectedCategory === "new" && (
              <TextInput
                radius="md"
                placeholder="Ваша категория"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.currentTarget.value)}
              />
            )}
            <Textarea
              radius="md"
              placeholder="Описание задачи"
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.currentTarget.value)}
              autosize
              minRows={2}
            />

            <Button
              onClick={handleAddTask}
              className={styles.addButton}
              radius="md"
            >
              Добавить
            </Button>
          </Stack>

          <div className={styles.taskList}>
            {(tasks[dateKey] || []).map((task) => {
              return (
                <Paper
                  key={task.id}
                  className={styles.taskItem}
                  radius="lg"
                  withBorder
                  shadow="xs"
                >
                  <Text size="sm" c="dimmed">
                    ⏰ {dayjs(task.time).local().format("HH:mm")}
                  </Text>
                  <div
                    className={styles.taskMain}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTaskOpen(task.id);
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <>
                      <ActionIcon
                        variant="subtle"
                        color={task.done ? "gray" : "red"}
                        radius="xl"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTask(dateKey, task.id);
                        }}
                      >
                        {task.done ? (
                          <IconCircleCheck size={18} />
                        ) : (
                          <IconCircle size={18} />
                        )}
                      </ActionIcon>

                      <Text className={task.done ? styles.taskDone : ""}>
                        {task.title} — <b>{task.category}</b>
                      </Text>
                    </>

                    <>{renderTaskActions(task.id)}</>
                  </div>

                  <Collapse in={!!openedTasks[task.id]}>
                    <Text className={styles.taskDescription}>
                      {task.description || <i>Нет описания</i>}
                    </Text>
                  </Collapse>
                </Paper>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

export default CalendarWithTasks;
