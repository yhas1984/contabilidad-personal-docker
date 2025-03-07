export function Footer() {
  return (
    <footer className="border-t py-6 md:py-0">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
        <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
          &copy; {new Date().getFullYear()} Tu Envío Express. Todos los derechos reservados.
        </p>
        <div className="flex items-center gap-4">
          <a href="#" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
            Términos
          </a>
          <a href="#" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
            Privacidad
          </a>
          <a href="#" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
            Contacto
          </a>
        </div>
      </div>
    </footer>
  )
}

