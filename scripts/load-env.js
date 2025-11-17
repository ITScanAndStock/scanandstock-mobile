// scripts/load-env.js
const fs = require('fs');
const path = require('path');

const env = process.env.EXPO_PUBLIC_ENV || 'development';
const envFile = path.resolve(__dirname, `../.env.${env}`);
const targetFile = path.resolve(__dirname, '../.env');

if (fs.existsSync(envFile)) {
	fs.copyFileSync(envFile, targetFile);
	console.log(`✅ Environment loaded: ${env}`);
	console.log(`📁 Using: .env.${env}`);
} else {
	console.warn(`⚠️  File .env.${env} not found`);
	console.log(`💡 Creating .env.${env} from .env.example`);

	const exampleFile = path.resolve(__dirname, '../.env.example');
	if (fs.existsSync(exampleFile)) {
		fs.copyFileSync(exampleFile, envFile);
		fs.copyFileSync(envFile, targetFile);
		console.log(`✅ Created .env.${env} from .env.example`);
	} else {
		console.error('❌ .env.example not found');
		process.exit(1);
	}
}
