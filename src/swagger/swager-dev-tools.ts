import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { MOCK_USER } from '@/lib/constants';
export async function setupSwagger(app: INestApplication) {
  await addAutoLoginFeature(app);
  const config = new DocumentBuilder()
    .setTitle('Dance-App API')
    .setDescription('B2B dance studio backend')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const doc = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, doc, {
    // Only include custom JS in development
    ...(process.env.NODE_ENV === 'development' && {
      customJs: '/swagger-custom.js',
    }),
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}
async function addAutoLoginFeature(app: INestApplication) {
  if (process.env.NODE_ENV === 'development') {
    // Serve dynamic auto-auth script
    app.use('/swagger-custom.js', (req, res) => {
      const script = `
        window.addEventListener('load', function() {
          setTimeout(() => {
            const authSection = document.querySelector('.auth-wrapper');
            if (authSection) {
              const autoLoginBtn = document.createElement('button');
              autoLoginBtn.className = 'btn authorize';
              autoLoginBtn.style = 'margin-left: 10px;';
              autoLoginBtn.onclick = autoLogin;

              const autoLoginBtnContent = document.createElement('span');
              autoLoginBtnContent.innerText = 'Auto Login';
              autoLoginBtn.appendChild(autoLoginBtnContent);
              authSection.appendChild(autoLoginBtn);
            }
          }, 1000);
        });

        async function autoLogin() {
          try {
            const credentials = {
              email: '${MOCK_USER.JOHN.email}',
              password: '${MOCK_USER.JOHN.password}'
            };
            
            const response = await fetch('/auth/sign-in', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(credentials)
            });
            
            const data = await response.json();
            console.log(data);
            if (data.accessToken) {
              window.ui.preauthorizeApiKey('bearer', data.accessToken);
              // alert('Auto-login successful!');
            }
          } catch (error) {
            console.error('Auto-login failed:', error);
          }
        }
      `;

      res.setHeader('Content-Type', 'application/javascript');
      res.send(script);
    });
  }
}
