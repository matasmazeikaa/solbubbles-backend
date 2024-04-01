import jwt from 'jsonwebtoken';
import { isRequestAuthorized } from '@/modules/auth';

export const authHandler = (req, res, next) => {
	try {
		const token = req.headers.authorization.split(' ')[1];
		const decodedData = jwt.verify(token, process.env.JWT_SECRET);

		req.userData = {
			publicKey: decodedData.publicKey
		};

		if (
			!isRequestAuthorized({
				publicKey: decodedData.publicKey,
				signature: decodedData.signature,
				nonce: decodedData.nonce
			})
		) {
			return res.status(401).json({
				status: 'error',
				errorMessage:
					'Unauthorized to make this request. Signature invalid.'
			});
		}

		next();
	} catch (e) {
		res.status(401).json({ status: 'error', errorMessage: 'Auth failed.' });
	}
};
