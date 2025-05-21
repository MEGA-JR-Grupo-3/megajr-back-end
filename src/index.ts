import { PrismaClient } from './generated/prisma'

const prisma = new PrismaClient()
// use `prisma` in your application to read and write data in your DB

async function CriarUsuario() {
  // Criar um novo usuário
  const newUser = await prisma.usuario.create({
    data: {
      nome: 'Lara Eridan',
      email: 'lara@gmail.com',
      senha: 'lara123'
    }
  })
  console.log('Usuário criado:', newUser)

  // Buscar todos os usuários
  const allUsers = await prisma.usuario.findMany()
  console.log('Todos usuários:', allUsers)
}

CriarUsuario()
  .catch(e => {
    throw e
  })
  .finally(async () => {
    await prisma.$disconnect()
  })