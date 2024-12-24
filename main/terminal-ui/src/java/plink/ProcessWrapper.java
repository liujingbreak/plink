package plink;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;

public class ProcessWrapper {
    public static void main(String[] args) {
        try {
            // Create a ProcessBuilder with the command you want to execute
            ProcessBuilder processBuilder = new ProcessBuilder("node", "/data/data/com.termux/files/home/plink/main/terminal-ui/src/samples/check-mouse.js")
              .directory(new java.io.File(".."));
            // Start the process
            Process process = processBuilder.start();

            // Get the input stream of the process
            InputStream processInputStream = process.getInputStream();
            // Get the output stream of the current Java program (to write input to the process)
            OutputStream processOutputStream = process.getOutputStream();

            // Create a thread to read the output from the process and print it to the system output
            Thread outputThread = new Thread(() -> {
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(processInputStream))) {
                    String line;
                    while ((line = reader.readLine())!= null) {
                        System.out.println(line);
                    }
                } catch (IOException e) {
                    e.printStackTrace();
                }
            });
            outputThread.start();

            // You can write input to the process from the system standard input here if needed
            // For simplicity, we don't write anything in this example. But if the command you execute
            // expects input, you can read from System.in and write to processOutputStream.
            System.out.write(System.in.available());
            while (System.in.available() > 0) {
                var b = System.in.readAllBytes();
                processOutputStream.write(b);
            }

            // Wait for the process to finish
            int exitCode = process.waitFor();
            System.out.println("Process exited with code: " + exitCode);

            // Wait for the output thread to finish
            try {
                outputThread.join();
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        } catch (IOException | InterruptedException e) {
            e.printStackTrace();
        }
    }
}

