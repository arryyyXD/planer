import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import '@mantine/core/styles.css';
import 'dayjs/locale/ru';
import App from './App.tsx'
import '@mantine/dates/styles.css';
import { DatesProvider } from '@mantine/dates';
import { createTheme, MantineProvider } from '@mantine/core';
import '@mantine/dates/styles.css';
import dayjs from 'dayjs';

dayjs.locale('ru');
const theme = createTheme({

})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme='light'>
      <DatesProvider settings={{ locale: 'ru', firstDayOfWeek: 1, weekendDays: [0] }}>
        <App />
      </DatesProvider>
    </MantineProvider>
  </StrictMode>,
)
