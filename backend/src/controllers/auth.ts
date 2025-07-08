import { Request, Response } from 'express';

export const register = (req: Request, res: Response) => {
  // Mock registration
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  return res.status(201).json({ 
    message: 'User registered successfully', 
    user: { name, email } 
  });
};

export const login = (req: Request, res: Response) => {
  // Mock login
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
  // Always succeed for now
  return res.status(200).json({ 
    message: 'Login successful', 
    token: 'mock-jwt-token', 
    user: { email, name: 'Test User' } 
  });
}; 