import { createStart, createCsrfMiddleware } from "@tanstack/react-start";

// Defining this file opts out of Start's default middleware, so re-add CSRF
// protection for server functions explicitly.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  requestMiddleware: [csrfMiddleware],
}));
