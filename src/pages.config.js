import Organizations from './pages/Organizations';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Dashboard from './pages/Dashboard';


export const PAGES = {
    "Organizations": Organizations,
    "Profile": Profile,
    "Settings": Settings,
    "Dashboard": Dashboard,
}

export const pagesConfig = {
    mainPage: "Organizations",
    Pages: PAGES,
};