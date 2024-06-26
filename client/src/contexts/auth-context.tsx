import type { FC, ReactNode } from 'react';
import { createContext, useCallback, useEffect, useReducer } from 'react';
import axios from 'axios';
import { User } from '../types/user';

const STORAGE_KEY = 'jira-token';

interface State {
  isInitialized: boolean;
  isAuthenticated: boolean;
  user: User | null;
}

enum ActionType {
  INITIALIZE = 'INITIALIZE',
  SIGN_IN = 'SIGN_IN',
  SIGN_OUT = 'SIGN_OUT',
}

type InitializeAction = {
  type: ActionType.INITIALIZE;
  payload: {
    isAuthenticated: boolean;
    user: User | null;
  };
};

type SignInAction = {
  type: ActionType.SIGN_IN;
  payload: {
    user: User;
  };
};

type SignOutAction = {
  type: ActionType.SIGN_OUT;
};

type Action = InitializeAction | SignInAction | SignOutAction;

type Handler = (state: State, action: any) => State;

const initialState: State = {
  isAuthenticated: false,
  isInitialized: false,
  user: null,
};

const handlers: Record<ActionType, Handler> = {
  INITIALIZE: (state: State, action: InitializeAction): State => {
    const { isAuthenticated, user } = action.payload;

    return {
      ...state,
      isAuthenticated,
      isInitialized: true,
      user,
    };
  },
  SIGN_IN: (state: State, action: SignInAction): State => {
    const { user } = action.payload;

    return {
      ...state,
      isAuthenticated: true,
      user,
    };
  },
  SIGN_OUT: (state: State): State => ({
    ...state,
    isAuthenticated: false,
    user: null,
  }),
};

const reducer = (state: State, action: Action): State =>
  handlers[action.type] ? handlers[action.type](state, action) : state;

export interface AuthContextType extends State {
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  ...initialState,
  signIn: () => Promise.resolve(),
  signOut: () => Promise.resolve(),
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: FC<AuthProviderProps> = (props) => {
  const { children } = props;
  const [state, dispatch] = useReducer(reducer, initialState);
  const baseUrlPaths = window.location.href.split('/');
  baseUrlPaths.pop();
  const baseUrl = baseUrlPaths.join('/');

  const initialize = useCallback(async (): Promise<void> => {
    try {
      const authToken = window.sessionStorage.getItem(STORAGE_KEY);

      if (authToken) {
        const user = (
          await axios({
            url: '/me',
            baseURL: baseUrl,
            method: 'get',
            headers: {
              Authorization: `Basic ${authToken}`,
            },
            responseType: 'json',
            withCredentials: true,
            validateStatus: function (status) {
              return status >= 200 && status <= 303;
            },
          })
        ).data as User;

        if (user) {
          return dispatch({
            type: ActionType.INITIALIZE,
            payload: {
              isAuthenticated: true,
              user,
            },
          });
        }
      }

      dispatch({
        type: ActionType.INITIALIZE,
        payload: {
          isAuthenticated: false,
          user: null,
        },
      });
    } catch (err) {
      dispatch({
        type: ActionType.INITIALIZE,
        payload: {
          isAuthenticated: false,
          user: null,
        },
      });
    }
  }, [dispatch]);

  useEffect(
    () => {
      initialize();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const signIn = useCallback(
    async (username: string, password: string): Promise<void> => {
      const authToken = btoa(`${username}:${password}`);

      const user = (
        await axios({
          url: '/auth',
          baseURL: baseUrl,
          method: 'post',
          headers: {
            Authorization: `Basic ${authToken}`,
          },
          responseType: 'json',
          withCredentials: true,
          validateStatus: function (status) {
            return status >= 200 && status <= 303;
          },
        })
      ).data as User;

      sessionStorage.setItem(STORAGE_KEY, authToken);

      dispatch({
        type: ActionType.SIGN_IN,
        payload: {
          user,
        },
      });
    },
    [dispatch]
  );

  const signOut = useCallback(async (): Promise<void> => {
    sessionStorage.removeItem(STORAGE_KEY);
    dispatch({ type: ActionType.SIGN_OUT });
  }, [dispatch]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const AuthConsumer = AuthContext.Consumer;
