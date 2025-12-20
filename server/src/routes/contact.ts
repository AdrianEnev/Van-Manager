import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { sendContactEmail } from '../services/mailer';

const contactBodySchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    email: z.string().email('Invalid email address'),
    phone: z.string().max(20).optional(),
    message: z.string().min(10, 'Message must be at least 10 characters').max(2000),
});

export const contactRoutes: FastifyPluginAsync = async (server) => {
    server.post('/contact', async (request, reply) => {
        try {
            const body = contactBodySchema.parse(request.body);

            await sendContactEmail({
                name: body.name,
                email: body.email,
                phone: body.phone,
                message: body.message,
            });

            return reply.status(200).send({ success: true, message: 'Contact form submitted successfully' });
        } catch (error: any) {
            if (error.name === 'ZodError') {
                return reply.status(400).send({
                    success: false,
                    message: 'Validation error',
                    errors: error.errors
                });
            }

            server.log.error(error);
            return reply.status(500).send({
                success: false,
                message: error.message || 'Failed to send contact form'
            });
        }
    });
};
