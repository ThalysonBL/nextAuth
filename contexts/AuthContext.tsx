import { createContext, ReactNode, useState, useEffect } from "react";

import { setCookie, parseCookies, destroyCookie } from "nookies"; //lib para armazenar dados no cookies do browser

import Router from "next/router";
import router from "next/router";

import { api } from "../services/apiClient";

type User = {
  //informações que tenho do usuário
  email: string;
  permissions: string[];
  roles: string[];
};

type SignInCredentials = {
  email: string;
  password: string;
};

type AuthContextData = {
  signIn: (credentials: SignInCredentials) => Promise<void>;
  signOut: () => void;
  user: User;
  isAuthenticated: boolean;
};

type AuthProviderProps = {
  children: ReactNode; //ReactNode é caracterizado para que o elemento receba qualquer tipo
};

let authChannel: BroadcastChannel;

export const AuthContext = createContext({} as AuthContextData); //contexto de autenticação

export function signOut() {
  destroyCookie(undefined, "nextauth.token"); //destroyCookie exclui o cookie
  destroyCookie(undefined, "nextauth.refreshToken");

  authChannel.postMessage('signOut');
  Router.push("/");

}

export function AuthProvider({ children }: AuthProviderProps) {
  //children recebe todos os elemento que estão dentro do AuthProvider
  const [user, setUser] = useState<User>(); // onde será armazenado os dados
  const isAuthenticated = !!user; // inicial false

  useEffect(() => {
    authChannel = new BroadcastChannel("auth");
    authChannel.onmessage = (message) => {
      switch (message.data) {
        case "signOut":
          signOut();
          break;
        default:
          break;
      }
    };
  }, []);

  useEffect(() => {
    //usado para carregar novamente o cookie
    const { "nextauth.token": token } = parseCookies(); //coloco o nome do cookie em aspas e redefino o nome do cookie
    // parseCookies é usado para acessar cookie
    if (token) {
      api
        .get("/me")
        .then((response) => {
          const { email, permissions, roles } = response.data;

          setUser({ email, permissions, roles });
        })
        .catch(() => {
          signOut();
        });
    }
  }, []);

  async function signIn({ email, password }: SignCredentials) {
    //funcão tipada com SignCredentials
    try {
      const response = await api.post("sessions", {
        email,
        password,
      });
      const { token, refreshToken, permissions, roles } = response.data; //pego de dentro do response

      setCookie(
        undefined, //primeiro param sempre underfined, pois lida no lado do browser e não no servidor
        "nextauth.token", //nome do token
        token, //valor do token
        {
          maxAge: 60 * 60 * 24 * 30, //30 days //tempo máximo do token
          path: "/", //quais caminhos da aplicação terão acesso a esse cookie; / signfica que toda a aplicação poderá usar o Cookie
        }
      );

      setCookie(
        undefined, //primeiro param sempre underfined, pois lida no lado do browser e não no servidor
        "nextauth.refreshToken", //nome do token
        refreshToken, //valor

        {
          maxAge: 60 * 60 * 24 * 30, //30 days //tempo máximo do refreshToken
          path: "/", //quais caminhos da aplicação terão acesso a esse cookie; / signfica que toda a aplicação poderá usar o Cookie
        }
      );
      setUser({
        email,
        permissions,
        roles,
      }); // estamos salvando o usuário

      api.defaults.headers["Authorization"] = `Bearer${token}`;

      Router.push("/dashboard"); //estamos enviando o usuário para a Dashboard
    } catch (err) {
      console.log(err);
    }
  }

  return (
    <AuthContext.Provider
      value={{ signIn, signOut, isAuthenticated, user }} //Provider que recebe os valores signIn e isAuthenticated
    >
      {children}
    </AuthContext.Provider>
  );
}

/// no _app.tsx deve ter um provider em volta do conteúdo
