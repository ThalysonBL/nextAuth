import { AuthTokenError } from "./../services/errors/AuthTokenError";
import {
  GetServerSideProps,
  GetServerSidePropsResult,
  GetServerSidePropsContext,
} from "next";
import { parseCookies, destroyCookie } from "nookies";
import decode from "jwt-decode";
import { validateUserPermissions } from "./validateUserPermissions";

type WithSSRAuthOptions = {
  permissions: string[];
  roles: string[];
};

export function withSSRAuth<P>(
  fn: GetServerSideProps<P>,
  options?: WithSSRAuthOptions
) {
  return async (
    ctx: GetServerSidePropsContext
  ): Promise<GetServerSidePropsResult<P>> => {
    const cookies = parseCookies(ctx);
    const token = cookies["nextauth.token"];
    if (!token) {
      return {
        redirect: {
          destination: "/",
          permanent: false,
        },
      };
    }
    if (options) {
      const user = decode<{ permissions: string[]; roles: string[] }>(token); //vamos ver o que tem dentro do token
      const { permissions, roles } = options;
      const userHasValidPermissions = validateUserPermissions({
        user,
        permissions,
        roles,
      });
      if (!userHasValidPermissions) {
        return {
          redirect: {
            destination: "/dashboard ",
            permanent: false,
          },
        };
      }
    }

    try {
      return await fn(ctx);
    } catch (err) {
      if (err instanceof AuthTokenError) {
        destroyCookie(ctx, "nextauth.token");
        destroyCookie(ctx, "nextauth.refreshToken");
        console.log(err);

        return {
          redirect: {
            destination: "/", //se o token expirar ou o servidor cair, vai para essa tela
            permanent: false,
          },
        };
      }
    }
  };
}
