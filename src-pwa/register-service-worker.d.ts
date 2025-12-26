declare module 'register-service-worker' {
  export interface RegisterOptions {
    registrationOptions?: RegistrationOptions;
    ready?: (registration: ServiceWorkerRegistration) => void;
    registered?: (registration: ServiceWorkerRegistration) => void;
    cached?: (registration: ServiceWorkerRegistration) => void;
    updatefound?: (registration: ServiceWorkerRegistration) => void;
    updated?: (registration: ServiceWorkerRegistration) => void;
    offline?: () => void;
    error?: (error: Error) => void;
  }

  export function register(
    scriptURL: string,
    options?: RegisterOptions
  ): void;
}

