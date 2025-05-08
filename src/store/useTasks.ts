import dayjs from 'dayjs';
import { create } from 'zustand';

export interface Task {
  id: string;
  title: string;
  done: boolean;
  category: string;
  description: string;
  time?: string | null;
  notificationTitle?: string; 
}

interface TaskStore {
  tasks: Record<string, Task[]>;
  addTask: (date: string, task: Task) => void;
  toggleTask: (date: string, taskId: string) => Promise<void>;
  editTask: (date: string, taskId: string, updatedTask: Partial<Task>) => void;
  updateTask: (dateKey: string, updatedTask: Task) => void;
}


export const useTasks = create<TaskStore>((set, get) => ({
  tasks: {},
  addTask: (date, task) => {
    set((state) => {
      const existingTasks = state.tasks[date] || [];
      const index = existingTasks.findIndex((t) => t.id === task.id);
  
      if (index !== -1) {
        const updatedTasks = [...existingTasks];
        updatedTasks[index] = task;
  
        return {
          tasks: {
            ...state.tasks,
            [date]: updatedTasks,
          },
        };
      }
  
      return {
        tasks: {
          ...state.tasks,
          [date]: [...existingTasks, task],
        },
      };
    });
  },

  
  toggleTask: async (dateKey, taskId) => {
    const token = localStorage.getItem('access_token');
    const task = get().tasks[dateKey]?.find((t) => t.id === taskId);
    if (!task) return;
  
    const updatedDone = !task.done;
    try {
      const notePayload = {
        title: task.title,
        description: task.description,
        done: updatedDone,
        date: dayjs(`${dateKey}T12:00:00`).toISOString(), 
        properties: { category: task.category },
      };
  
      const res = await fetch(`https://app-planer.online/notes/update/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(notePayload),
      });
  
      if (!res.ok) {
        console.error('Ошибка при обновлении done:', await res.text());
        return;
      }
  
      set((state) => ({
        tasks: {
          ...state.tasks,
          [dateKey]: state.tasks[dateKey].map((t) =>
            t.id === taskId ? { ...t, done: updatedDone } : t
          ),
        },
      }));
    } catch (error) {
      console.error('Ошибка при переключении done:', error);
    }
  },

  editTask: (date, taskId, updatedTask) => {
    set((state) => {
      const dayTasks = state.tasks[date];
      if (!dayTasks) return state;
      return {
        tasks: {
          ...state.tasks,
          [date]: dayTasks.map((task) =>
            task.id === taskId ? { ...task, ...updatedTask } : task
          ),
        },
      };
    });
  },

  updateTask: (dateKey: string, updatedTask: Task) =>
    set((state) => {
      const dayTasks = state.tasks[dateKey] || [];
      const updatedTasks = dayTasks.map((task) =>
        task.id === updatedTask.id ? { ...task, ...updatedTask } : task
      );

      return {
        tasks: {
          ...state.tasks,
          [dateKey]: updatedTasks, 
        },
      };
  }),
  
}));

