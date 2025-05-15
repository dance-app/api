import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import * as fs from 'fs';
import * as handlebars from 'handlebars';
import { join } from 'path';

import { MailHelperService } from './mail-helper.service';
import { MailTransportFactory } from './mail-transport.factory';
import { MailService } from './mail.service';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (
        transportFactory: MailTransportFactory,
        config: ConfigService,
      ) => {
        const baseTransport = await transportFactory.createTransport();
        return {
          ...baseTransport,
          defaults: {
            from: `"No Reply" <${config.get('MAIL_FROM')}>`,
          },
          preview: {
            open: config.get('MAIL_DEBUG'),
          },
          template: {
            dir: join(__dirname, 'templates'),
            adapter: new HandlebarsAdapter(),
            options: {
              strict: true,
            },
          },
        };
      },
      inject: [MailTransportFactory, ConfigService],
      extraProviders: [MailTransportFactory],
    }),
  ],
  providers: [MailService, MailHelperService, MailTransportFactory],
  exports: [MailService],
})
export class MailModule implements OnModuleInit {
  constructor() {}

  async onModuleInit() {
    // Register partials
    this.registerPartials();

    // Register layouts as partials (for layout support)
    this.registerLayouts();

    // Register custom helpers
    this.registerHelpers();
  }

  private registerPartials() {
    const partialsDir = join(__dirname, 'templates', 'partials');

    try {
      // Read the partials directory
      const partialFiles = fs.readdirSync(partialsDir);

      // Register each partial
      partialFiles.forEach((file) => {
        const matches = /^([^.]+).hbs$/.exec(file);
        if (!matches) return;

        const name = matches[1];
        const template = fs.readFileSync(join(partialsDir, file), 'utf8');
        handlebars.registerPartial(name, template);
        handlebars.registerPartial(`partials/${name}`, template);
      });
    } catch (error) {
      console.error('Error registering partials:', error);
    }
  }

  private registerLayouts() {
    const layoutsDir = join(__dirname, 'templates', 'layouts');

    try {
      // Read the layouts directory
      const layoutFiles = fs.readdirSync(layoutsDir);

      // Register each layout as a partial
      layoutFiles.forEach((file) => {
        const matches = /^([^.]+).hbs$/.exec(file);
        if (!matches) return;

        const name = matches[1];
        const template = fs.readFileSync(join(layoutsDir, file), 'utf8');
        handlebars.registerPartial(`layouts/${name}`, template);
      });
    } catch (error) {
      console.error('Error registering layouts:', error);
    }
  }

  private registerHelpers() {
    
    handlebars.registerHelper('extend', function(name, context) {
      let template = handlebars.partials[name];
      
      // Return executed partial
      if (typeof template === 'function') {
        return template(context.data.root);
      }
      
      // Compile string partial to function and execute
      if (typeof template === 'string') {
        template = handlebars.compile(template);
        handlebars.partials[name] = template;
        return template(context.data.root);
      }
      
      return '';
    });
    
    // Block helper
    handlebars.registerHelper('block', function(name, options) {
      const block = this.blocks || (this.blocks = {});
      block[name] = options.fn;
      return null;
    });
    
    // Content helper
    handlebars.registerHelper('content', function(name, options) {
      const block = this.blocks || (this.blocks = {});
      return block[name] ? block[name](this) : options.fn(this);
    });
    
    handlebars.registerHelper('formatDate', function (date) {
      // Simple date formatting example
      const d = date instanceof Date ? date : new Date(date);
      return d.toLocaleDateString();
    });
  }
}
