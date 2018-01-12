module.exports = {
  postgres: {
    connectionString: 'postgres://ugprhgyhqqwbvf:90082e4317b96e7d9d6323f9ccdc39a592adab255f6cbc407f87e8d7477f64c7@ec2-54-235-148-19.compute-1.amazonaws.com:5432/dcicgm0iersp1g',
    connectionObject: {
      host: 'ec2-54-235-148-19.compute-1.amazonaws.com',
      database: 'dcicgm0iersp1g',
      user: 'ugprhgyhqqwbvf',
      port: 5432,
      password: '90082e4317b96e7d9d6323f9ccdc39a592adab255f6cbc407f87e8d7477f64c7',
      //max and min pool connections
      max: 20,
      min: 1,
      ssl: true
    }
  }
};