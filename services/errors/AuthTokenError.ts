export class AuthTokenError extends Error {
  constructor() {
    super('Error with authentication token')//super chama a class Error
  }
}
