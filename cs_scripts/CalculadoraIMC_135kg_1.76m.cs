using System;

class Program
{
    static void Main()
    {
        // Datos del paciente
        double peso = 135.0; // kg
        double altura = 1.76; // metros
        
        // Cálculo del IMC
        double imc = peso / (altura * altura);
        
        // Mostrar resultados
        Console.WriteLine("=== CÁLCULO DE IMC ===");
        Console.WriteLine($"Peso: {peso} kg");
        Console.WriteLine($"Altura: {altura} m");
        Console.WriteLine($"IMC: {imc:F2}");
        
        // Categoría
        string categoria;
        if (imc < 18.5) categoria = "Bajo peso";
        else if (imc < 25) categoria = "Normal";
        else if (imc < 30) categoria = "Sobrepeso";
        else if (imc < 35) categoria = "Obesidad grado I";
        else if (imc < 40) categoria = "Obesidad grado II";
        else categoria = "Obesidad grado III";
        
        Console.WriteLine($"Categoría: {categoria}");
        
        // Recomendaciones
        Console.WriteLine("\n=== RECOMENDACIONES ===");
        if (imc < 18.5)
        {
            Console.WriteLine("• Consumir más calorías y proteínas");
            Console.WriteLine("• Entrenamiento de fuerza recomendado");
        }
        else if (imc < 25)
        {
            Console.WriteLine("• Mantener hábitos saludables");
            Console.WriteLine("• Ejercicio regular 150 min/semana");
        }
        else if (imc < 30)
        {
            Console.WriteLine("• Reducir calorías y azúcares");
            Console.WriteLine("• Ejercicio cardiovascular 3-5 veces/semana");
        }
        else
        {
            Console.WriteLine("• Consultar con nutricionista y médico");
            Console.WriteLine("• Plan de pérdida de peso supervisado");
        }
    }
}