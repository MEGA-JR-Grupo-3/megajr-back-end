import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testConnection() {
  try {
    // Teste de leitura
    const users = await prisma.usuario.findMany()
    console.log('✅ Conexão bem-sucedida! Usuários encontrados:', users.length)
    
    // Teste de escrita (opcional)
    const newUser = await prisma.usuario.create({
      data: {
        nome: 'Sabino',
        email: `sabino@example.com`,
        senha: 'senha123',
        foto_perfil: ''
      }
    })
    console.log('✅ Usuário teste criado com ID:', newUser.id_usuario)
    
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('❌ Falha na conexão:', error.message)
    } else {
      console.error('❌ Erro desconhecido:', error)
    }
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()








// import { PrismaClient } from '@prisma/client';
// const prisma = new PrismaClient();

// async function test() {
//   const users = await prisma.usuario.findMany();
//   console.log(users);
// }
// test();

// import { PrismaClient } from './generated/prisma'

// const prisma = new PrismaClient()
// // use `prisma` in your application to read and write data in your DB

// async function CriarUsuario() {
//   // Criar um novo usuário
//   const newUser = await prisma.usuario.create({
//     data: {
//       nome: 'Lara Eridan',
//       email: 'lara@gmail.com',
//       senha: 'lara123'
//     }
//   })
//   console.log('Usuário criado:', newUser)

//   // Buscar todos os usuários
//   const allUsers = await prisma.usuario.findMany()
//   console.log('Todos usuários:', allUsers)
// }

// CriarUsuario()
//   .catch(e => {
//     throw e
//   })
//   .finally(async () => {
//     await prisma.$disconnect()
//   })