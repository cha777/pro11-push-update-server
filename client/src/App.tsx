import Footer from './components/footer';
import Header from './components/header';
import Login from './components/login';
import SplashScreen from './components/splash-screen';
import Uploader from './components/upload';
import { AuthConsumer, AuthProvider } from './contexts/auth-context';

function App() {
  return (
    <>
      <Header />
      <main>
        <AuthProvider>
          <AuthConsumer>
            {(auth) => {
              if (!auth.isInitialized) {
                return <SplashScreen />;
              }

              if (auth.isAuthenticated) {
                return <Uploader />;
              }

              return <Login />;
            }}
          </AuthConsumer>
        </AuthProvider>
      </main>
      <Footer />
    </>
  );
}

export default App;
