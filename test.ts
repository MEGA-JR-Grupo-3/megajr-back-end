// import { PrismaClient } from '@prisma/client'

// const prisma = new PrismaClient()

// async function testConnection() {
//   try {
//     // Teste de leitura
//     const users = await prisma.usuario.findMany()
//     console.log('✅ Conexão bem-sucedida! Usuários encontrados:', users.length)
    
//     // Teste de escrita (opcional)
//     const newUser = await prisma.usuario.create({
//       data: {
//         nome: 'Vitor Cavanha',
//         email: `vitor@example.com`,
//         senha: 'senha123',
//         foto_perfil: 'https://imgs.search.brave.com/R7I1eo3LAboNrmCWFk3XGo3HTJJZi4phu15WjoZBj9A/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9wbmdm/cmUuY29tL3dwLWNv/bnRlbnQvdXBsb2Fk/cy9kb2ctMTQ1LTI2/NngzMDAucG5n'
//       }
//     })
//     console.log('✅ Usuário teste criado com ID:', newUser.id_usuario)
    
//   } catch (error: unknown) {
//     if (error instanceof Error) {
//       console.error('❌ Falha na conexão:', error.message)
//     } else {
//       console.error('❌ Erro desconhecido:', error)
//     }
//   } finally {
//     await prisma.$disconnect()
//   }
// }

// testConnection()